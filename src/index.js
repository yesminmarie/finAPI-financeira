const { response } = require("express");
const express = require("express");
const {v4: uuidv4 } = require("uuid");

const app = new express();

app.use(express.json());

const customers = [];

//Middleware
function verifyIfExistsAcountCPF(request, response, next){

    const { cpf } = request.headers;

    const customer = customers.find(customer => customer.cpf === cpf);

    if(!customer){
        return response.status(400).json({ error: "Customer not found" });
    }

    //repassa o customer dentro do request para que as rotas que chamarem esse middleware possam ter acesso
    request.customer = customer;

    //se a conta existir, continua todo o processo da rota
    return next();
}

function getBalance(statement) {
    const balance = statement.reduce((acc, operation) => {
        if(operation.type === 'credit'){
            return acc + operation.amount;
        }else {
            return acc - operation.amount;
        }
    }, 0);

    return balance;
}
app.post("/account", (request, response) => {
    const { cpf, name } = request.body;

    //verifica se já existe um customer com mesmo cpf
    const customerAlreadyExists = customers.some(
        (customer) => customer.cpf === cpf
    );

    if(customerAlreadyExists){
        return response.status(400).json({ error: "Customer already exists!"})
    }

    customers.push({
        cpf,
        name,
        id: uuidv4(),
        statement: []
    });

    return response.status(201).send();
});

//se passar o middleware assim, todas as rotas abaixo dele o usarão
//app.use(verifyIfExistsAcountCPF);

//middleware passado direto na rota
app.get("/statement", verifyIfExistsAcountCPF, (request, response) => {
    //recupera o customer passado dentro do request pelo middleware
    const { customer } = request;
    return response.json(customer.statement)
});

app.post("/deposit", verifyIfExistsAcountCPF, (request, response) => {
    const { description, amount } = request.body;

    const { customer } = request;

    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    }

    customer.statement.push(statementOperation);

    return response.status(201).send();
});

app.post("/withdraw", verifyIfExistsAcountCPF, (request, response) => {
    const { amount } = request.body;
    const { customer } = request;

    const balance = getBalance(customer.statement);

    if(balance < amount){
        return response.status(400).json({error: "Insufficient funds!"});
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit"
    };

    customer.statement.push(statementOperation);

    return response.status(201).send();
});

app.get("/statement/date", verifyIfExistsAcountCPF, (request, response) => {
    const { customer } = request;
    const { date } = request.query;

    const dateFormat = new Date(date + " 00:00");

    const statement = customer.statement.filter(
        (statement) => statement.created_at.toDateString() === dateFormat.toDateString());

    return response.json(statement);
});

app.put("/account", verifyIfExistsAcountCPF, (request, response) => {
    const { name } = request.body;
    const { customer } = request;

    customer.name = name;

    return response.status(201).send();
});

app.get("/account", verifyIfExistsAcountCPF, (request, response) => {
    const { customer } = request;

    return response.json(customer);
});

app.delete("/account", verifyIfExistsAcountCPF, (request, response) => {
    const { customer } = request;

    customers.splice(customer, 1);

    return response.status(200).json(customers);
});

app.get("/balance", verifyIfExistsAcountCPF, (request, response) => {
    const { customer } = request;

    const balance = getBalance(customer.statement);

    return response.json(balance);
})
app.listen(3333);

