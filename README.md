<div align="center">

# 🦟 DengueTracker Backend

**Sistema Inteligente de Monitoramento e Combate à Dengue**

![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)

<p align="center">
  <a href="#-sobre-o-projeto">Sobre</a> •
  <a href="#-funcionalidades">Funcionalidades</a> •
  <a href="#-tecnologias">Tecnologias</a> •
  <a href="#-instalação-e-execução">Instalação</a> •
  <a href="#-autor">Autor</a>
</p>

</div>

---

## 📖 Sobre o Projeto

O **DengueTracker Backend** é uma solução robusta desenvolvida para auxiliar no combate à dengue através de tecnologia de monitoramento inteligente. 

Este sistema fornece as APIs necessárias para o gerenciamento de dados epidemiológicos, permitindo que autoridades e cidadãos tenham um controle mais efetivo sobre focos da doença e casos reportados. O objetivo é utilizar dados para prevenir surtos e salvar vidas.

## 🚀 Funcionalidades

O sistema foi projetado para oferecer um controle completo:

* **📍 Gerenciamento de Focos:** Registro e mapeamento de locais com focos de reprodução do mosquito.
* **🩺 Controle de Casos:** Monitoramento de casos suspeitos e confirmados da doença.
* **📢 Alertas Epidemiológicos:** Sistema de emissão de alertas baseados em dados críticos.
* **🔐 Autenticação Segura:** Controle de acesso utilizando JSON Web Tokens (JWT).

## 🛠 Tecnologias

As seguintes ferramentas foram utilizadas na construção deste projeto:

* **[Node.js](https://nodejs.org/en/)** - Ambiente de execução Javascript server-side.
* **[Express](https://expressjs.com/)** - Framework web rápido e minimalista.
* **[MongoDB](https://www.mongodb.com/)** - Banco de dados NoSQL orientado a documentos.
* **[JWT](https://jwt.io/)** - Padrão para autenticação segura.

## 📦 Instalação e Execução

Para rodar o backend localmente, siga os passos abaixo no seu terminal:

```bash
# 1. Clone o repositório
git clone [https://github.com/oliverws7/DengueTracker.git](https://github.com/oliverws7/DengueTracker.git)

# 2. Acesse a pasta do backend
cd dengue-tracker-backend

# 3. Instale as dependências
npm install

# 4. Configure as variáveis de ambiente (Crie um arquivo .env baseado no exemplo, se houver)
# Exemplo: CP .env.example .env

# 5. Inicie o servidor em modo de desenvolvimento
npm run dev

Método,Ponto final,Descrição
POST,/api/auth/login,Autenticação de usuário
GET,/api/cases,Listar todos os casos registrados
POST,/api/cases,Reportar um novo caso suspeito
GET,/api/outbreaks,Listar focos do mosquito

