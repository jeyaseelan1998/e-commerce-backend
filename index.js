const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json());
app.use(cors());

const secretKey = "INSTA_SHARE_TOKEN";

const PORT = process.env.PORT || 3000;

const dbPath = path.join(__dirname, "Ecommerce.db");

let db = null;

const initializeDBAndStartServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(PORT, () =>
      console.log(`Server started at http://localhost:${PORT}`)
    );
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
};

initializeDBAndStartServer();

const authenticateToken = async (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (!jwtToken) {
    response.statusCode = 401;
    response.send("Invalid JWT_TOKEN");
  } else {
    jwt.verify(jwtToken, secretKey, (error, payload) => {
      if (error) {
        response.statusCode = 401;
        response.send("Invalid JWT_TOKEN");
      } else {
        request.username = payload;
        next();
      }
    });
  }
};

app.post("/register", async (request, response) => {
  const { username, password, displayName, email, mobile = "" } = request.body;

  const GET_USER_SQL_QUERY = `SELECT * FROM user WHERE username = '${username}'`;
  const userDetails = await db.get(GET_USER_SQL_QUERY);

  if (!userDetails) {
    const GET_USER_SQL_QUERY = `SELECT * FROM user WHERE email = '${email}'`;
    const userDetails = await db.get(GET_USER_SQL_QUERY);
    if (userDetails) {
      response.statusCode = 401;
      response.send("email already exists");
    } else {
      const hashedPassword = await bcrypt.hash(password, 6);

      const INSERT_USER_QUERY = `INSERT INTO user
                      (username, password, display_name, email, mobile)
                      VALUES
                      ('${username}', '${hashedPassword}', '${displayName}', '${email}', '${mobile}');`;

      const dbResponse = await db.run(INSERT_USER_QUERY);
      response.send(`User created with ${dbResponse.lastID}`);
    }
  } else {
    response.statusCode = 401;
    response.send("username already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  const GET_USER_SQL_QUERY = `SELECT * FROM user WHERE username = '${username}'`;
  const userDetails = await db.get(GET_USER_SQL_QUERY);

  if (!userDetails) {
    response.statusCode = 400;
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      userDetails.password
    );

    if (!isPasswordMatched) {
      response.statusCode = 400;
      response.send("Invalid password");
    } else {
      const jwt_token = jwt.sign(userDetails.username, secretKey);

      response.send({jwt_token});
    }
  }
});
