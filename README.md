# two-factor-auth-backend

# configurar o projeto

rodar o comando `yarn` ou `npm install` para instalar as bibliotecas necessárias

criar um arquivo chamado .env na pasta raiz do projeto com o seguinte conteúdo: `DATABASE_URL="file:./dev.db"`

para configurar o banco de dados rode: 

1 - `yarn db:migrate` 

2 - `yarn db:push`

Caso queira consultar o banco de dados rode: `npx prisma studio`

por fim, rode o projeto com `yarn start`

# como utilizar a aplicação

A aplicação é uma API, logo deve ser testada em softwares de backend (e.g Postman) 

- Rota `/register` 

Envia um POST no estilo:

`{"email": "teste@teste.com", "password": "12345"}`

e retorna uma mensagem de sucesso caso ocorra tudo certo.

- Rota `/login` 

Envia um POST no estilo:

`{"email": "teste@teste.com", "password": "12345"}`

e retorna uma mensagem de sucesso com um token de 2FA caso ocorra tudo certo.

- Rota `/login/verify` 

Envia um POST no estilo:

`{"user_id": "1234_12312_1234124", "token": "12A3W5"}`

obs: O user ID pode ser coletado no banco de dados (utilize o comando `npx prisma studio` para ter acesso)

e retorna uma mensagem de sucesso caso ocorra tudo certo.
