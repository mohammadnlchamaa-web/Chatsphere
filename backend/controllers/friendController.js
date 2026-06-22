const User = require("../models/User");

const searchUsers = async (req, res) => {
  const users = await User.find({
    username: { $regex: req.query.query || "", $options: "i" }
  }).select("-password");

  res.json(users);
};

const sendRequest = async (req, res) => {
  const { userId, friendId } = req.body;

  const user = await User.findById(friendId);

  if (!user.friendRequests.includes(userId)) {
    user.friendRequests.push(userId);
    await user.save();
  }

  res.json({ message: "Request sent" });
};

const acceptRequest = async (req, res) => {
  const { userId, friendId } = req.body;

  const user = await User.findById(userId);
  const friend = await User.findById(friendId);

  user.friends.push(friendId);
  friend.friends.push(userId);

  user.friendRequests = user.friendRequests.filter(
    id => id.toString() !== friendId
  );

  await user.save();
  await friend.save();

  res.json({ message: "Friend added" });
};

module.exports = { searchUsers, sendRequest, acceptRequest };