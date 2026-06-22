const express = require("express");
const router = express.Router();

const {
    searchUsers,
    sendRequest,
    acceptRequest
} = require("../controllers/friendController");

// search users
router.get("/search", searchUsers);

// friend request
router.post("/request", sendRequest);

// accept request
router.post("/accept", acceptRequest);

module.exports = router;