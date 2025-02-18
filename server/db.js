const pg = require("pg");
const client = new pg.Client();
const uuid = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const secret = process.env.JWT || "shhh";

const createTables = async () => {
  const SQL = `
    DROP TABLE IF EXISTS comments;
    DROP TABLE IF EXISTS reviews;
    DROP TABLE IF EXISTS items;
    DROP TABLE IF EXISTS users;

    CREATE TABLE users (
        id UUID PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password TEXT NOT NULL
    );
  
    CREATE TABLE items (
        id UUID PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        image_url TEXT
    );
  
    CREATE TABLE reviews (
        id UUID PRIMARY KEY,
        content TEXT NOT NULL,
        rating INT NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id),
        item_id UUID NOT NULL REFERENCES items(id),
        CONSTRAINT unique_user_id_per_review UNIQUE (user_id, item_id)
    );

    CREATE TABLE comments (
        id UUID PRIMARY KEY,
        content TEXT NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id),
        review_id UUID NOT NULL REFERENCES reviews(id) NOT NULL
    );
    `;
  await client.query(SQL);
};

const createUser = async ({ username, password }) => {
  const SQL = `
      INSERT INTO users (id, username, password)
      VALUES($1, $2, $3)
      RETURNING *
    `;
  const hashedPassword = await bcrypt.hash(password, 5);
  const response = await client.query(SQL, [
    uuid.v4(),
    username,
    hashedPassword,
  ]);
  return response.rows[0];
};

const createItem = async ({ name, description, image_url }) => {
  const SQL = `
    INSERT INTO items (id, name, description, image_url)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const response = await client.query(SQL, [
    uuid.v4(),
    name,
    description,
    image_url,
  ]);
  return response.rows[0];
};

const createReview = async ({ content, rating, user_id, item_id }) => {
  const SQL = `
    INSERT INTO reviews (id, content, rating, user_id, item_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const response = await client.query(SQL, [
    uuid.v4(),
    content,
    rating,
    user_id,
    item_id,
  ]);
  return response.rows[0];
};

const createComment = async ({ content, user_id, review_id }) => {
  const SQL = `
    INSERT INTO comments (id, content, user_id, review_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const response = await client.query(SQL, [
    uuid.v4(),
    content,
    user_id,
    review_id,
  ]);
  return response.rows[0];
};

const authenticate = async ({ username, password }) => {
  const SQL = `
    SELECT id, password
    FROM users
    WHERE username = $1
  `;
  const response = await client.query(SQL, [username]);
  if (
    !response.rows.length ||
    !(await bcrypt.compare(password, response.rows[0].password))
  ) {
    const error = Error("not authorized");
    error.status = 401;
    throw error;
  }
  const token = jwt.sign({ id: response.rows[0].id }, secret);
  return { token };
};

const fetchUsers = async () => {
  const SQL = `
    SELECT id, username 
    FROM users
  `;
  const response = await client.query(SQL);
  return response.rows;
};

const fetchItems = async () => {
  const SQL = `
    SELECT id, name, description, image_url
    FROM items
  `;
  const response = await client.query(SQL);
  return response.rows;
};

const fetchUserReviews = async () => {
  const SQL = `
    SELECT reviews.id, content, rating, user_id, item_id, users.username
    FROM reviews
    JOIN users ON reviews.user_id = users.id
  `;
  const response = await client.query(SQL);
  return response.rows;
};

const fetchUserComments = async () => {
  const SQL = `
    SELECT comments.id, content, user_id, review_id, users.username
    FROM comments
    JOIN users ON comments.user_id = users.id
  `;
  const response = await client.query(SQL);
  return response.rows;
};

const fetchAllReviews = async () => {
  const SQL = `
    SELECT id, content, rating, user_id, item_id
    FROM reviews
  `;
  const response = await client.query(SQL);
  return response.rows;
};

const fetchAllComments = async () => {
  const SQL = `
    SELECT id, content, user_id, review_id
    FROM comments
  `;
  const response = await client.query(SQL);
  return response.rows;
};

const deleteUser = async (id) => {
  const SQL = `
    DELETE FROM users
    WHERE id = $1
    RETURNING *;
  `;
  const response = await client.query(SQL, [id]);
  return response.rows[0];
};

const deleteItem = async (id) => {
  const SQL = `
    DELETE FROM items
    WHERE id = $1
    RETURNING *;
  `;
  const response = await client.query(SQL, [id]);
  return response.rows[0];
};

const deleteReview = async (id) => {
  const SQL = `
    DELETE FROM reviews
    WHERE id = $1
    RETURNING *;
  `;
  const response = await client.query(SQL, [id]);
  return response.rows[0];
};

const deleteComment = async (id) => {
  const SQL = `
    DELETE FROM comments
    WHERE id = $1
    RETURNING *;
  `;
  const response = await client.query(SQL, [id]);
  return response.rows[0];
};

const findUserByToken = async (token) => {
  let id;
  try {
    const payload = await jwt.verify(token, secret);
    id = payload.id;
  } catch (err) {
    const error = Error("Not authorized!");
    error.status = 401;
    throw error;
  }
  const SQL = `
    SELECT id, username
    FROM users
    WHERE id = $1
  `;
  const response = await client.query(SQL, [id]);
  if (!response.rows.length) {
    const error = Error("not authorized");
    error.status = 401;
    throw error;
  }
  return response.rows[0];
};

const isLoggedIn = async (req, res, next) => {
  try {
    req.user = await findUserByToken(req.headers.authorization);
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  client,
  createTables,
  createUser,
  createItem,
  createReview,
  createComment,
  authenticate,
  fetchUsers,
  fetchItems,
  fetchUserReviews,
  fetchUserComments,
  fetchAllReviews,
  fetchAllComments,
  deleteUser,
  deleteItem,
  deleteReview,
  deleteComment,
  findUserByToken,
  isLoggedIn,
};
