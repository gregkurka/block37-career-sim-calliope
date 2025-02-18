require("dotenv").config();
const {
  client,
  createTables,
  createUser,
  createItem,
  createReview,
  createComment,
  authenticate,
  findUserByToken,
  isLoggedIn,
  fetchUsers,
  fetchItems,
  fetchAllReviews,
  fetchAllComments,
  fetchUserReviews,
  fetchUserComments,
  deleteUser,
  deleteItem,
  deleteReview,
  deleteComment,
} = require("./db");

const express = require("express");
const app = express();
app.use(express.json());

const path = require("path");
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "../client/dist/index.html"))
);
app.use(
  "/assets",
  express.static(path.join(__dirname, "../client/dist/assets"))
);

app.post("/api/auth/register", async (req, res, next) => {
  try {
    res.status(201).send(await createUser(req.body));
  } catch (ex) {
    next(ex);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    res.send(await authenticate(req.body));
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/auth/me", isLoggedIn, async (req, res, next) => {
  try {
    res.send(await findUserByToken(req.headers.authorization));
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/items", async (req, res, next) => {
  try {
    res.send(await fetchItems());
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/items/:itemId", async (req, res, next) => {
  try {
    const items = await fetchItems();
    const item = items.find((item) => item.id === req.params.itemId);
    if (!item) {
      res.status(404).send({ error: "Item not found" });
    } else {
      res.send(item);
    }
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/items/:itemId/reviews", async (req, res, next) => {
  try {
    const reviews = await fetchAllReviews();
    res.send(reviews.filter((review) => review.item_id === req.params.itemId));
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/items/:itemId/reviews/:reviewId", async (req, res, next) => {
  try {
    const reviews = await fetchAllReviews();
    const review = reviews.find(
      (r) => r.id === req.params.reviewId && r.item_id === req.params.itemId
    );
    if (!review) {
      res.status(404).send({ error: "Review not found" });
    } else {
      res.send(review);
    }
  } catch (ex) {
    next(ex);
  }
});

app.post("/api/items/:itemId/reviews", isLoggedIn, async (req, res, next) => {
  try {
    res.status(201).send(
      await createReview({
        ...req.body,
        user_id: req.user.id,
        item_id: req.params.itemId,
      })
    );
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/reviews/me", isLoggedIn, async (req, res, next) => {
  try {
    const reviews = await fetchUserReviews();
    res.send(reviews.filter((review) => review.user_id === req.user.id));
  } catch (ex) {
    next(ex);
  }
});

app.put(
  "/api/users/:userId/reviews/:reviewId",
  isLoggedIn,
  async (req, res, next) => {
    try {
      const reviews = await fetchUserReviews();
      const review = reviews.find(
        (r) => r.id === req.params.reviewId && r.user_id === req.user.id
      );
      if (!review) {
        res.status(404).send({ error: "Review not found or unauthorized" });
      } else {
        await deleteReview(req.params.reviewId);
        res.send(
          await createReview({
            ...req.body,
            user_id: req.user.id,
            item_id: review.item_id,
          })
        );
      }
    } catch (ex) {
      next(ex);
    }
  }
);

app.post(
  "/api/items/:itemId/reviews/:reviewId/comments",
  isLoggedIn,
  async (req, res, next) => {
    try {
      res.status(201).send(
        await createComment({
          ...req.body,
          user_id: req.user.id,
          review_id: req.params.reviewId,
        })
      );
    } catch (ex) {
      next(ex);
    }
  }
);

app.get("/api/comments/me", isLoggedIn, async (req, res, next) => {
  try {
    const comments = await fetchUserComments();
    res.send(comments.filter((comment) => comment.user_id === req.user.id));
  } catch (ex) {
    next(ex);
  }
});

app.put(
  "/api/users/:userId/comments/:commentId",
  isLoggedIn,
  async (req, res, next) => {
    try {
      const comments = await fetchUserComments();
      const comment = comments.find(
        (c) => c.id === req.params.commentId && c.user_id === req.user.id
      );
      if (!comment) {
        res.status(404).send({ error: "Comment not found or unauthorized" });
      } else {
        await deleteComment(req.params.commentId);
        res.send(
          await createComment({
            ...req.body,
            user_id: req.user.id,
            review_id: comment.review_id,
          })
        );
      }
    } catch (ex) {
      next(ex);
    }
  }
);

app.delete(
  "/api/users/:userId/comments/:commentId",
  isLoggedIn,
  async (req, res, next) => {
    try {
      const comments = await fetchUserComments();
      const comment = comments.find(
        (c) => c.id === req.params.commentId && c.user_id === req.user.id
      );
      if (!comment) {
        res.status(404).send({ error: "Comment not found or unauthorized" });
      } else {
        await deleteComment(req.params.commentId);
        res.sendStatus(204);
      }
    } catch (ex) {
      next(ex);
    }
  }
);

app.delete(
  "/api/users/:userId/reviews/:reviewId",
  isLoggedIn,
  async (req, res, next) => {
    try {
      const reviews = await fetchUserReviews();
      const review = reviews.find(
        (r) => r.id === req.params.reviewId && r.user_id === req.user.id
      );
      if (!review) {
        res.status(404).send({ error: "Review not found or unauthorized" });
      } else {
        await deleteReview(req.params.reviewId);
        res.sendStatus(204);
      }
    } catch (ex) {
      next(ex);
    }
  }
);

app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message || err });
});

const init = async () => {
  console.log("connecting to database");
  await client.connect();
  console.log("connected to database");
  await createTables();
  console.log("tables created");

  const [user1, user2] = await Promise.all([
    createUser({ username: "testuser1", password: "password1" }),
    createUser({ username: "testuser2", password: "password2" }),
  ]);

  const [item1, item2] = await Promise.all([
    createItem({
      name: "Item 1",
      description: "Description for Item 1",
      image_url: "image1.jpg",
    }),
    createItem({
      name: "Item 2",
      description: "Description for Item 2",
      image_url: "image2.jpg",
    }),
  ]);

  const [review1] = await Promise.all([
    createReview({
      content: "Great product!",
      rating: 5,
      user_id: user1.id,
      item_id: item1.id,
    }),
  ]);

  await Promise.all([
    createComment({
      content: "I agree!",
      user_id: user2.id,
      review_id: review1.id,
    }),
  ]);

  console.log("data seeded");

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`listening on port ${port}`));
};

init();
