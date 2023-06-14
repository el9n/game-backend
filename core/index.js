const fs = require("fs");
const cors = require("cors");
const express = require("express");
const app = express();
const ConnectionManager = require("./classes/ConnectionManager");
const Game = require("./classes/Game");
const SaveManager = require("./classes/SaveManager");

const PORT = 3000;
const HOST = "localhost";

// настройка CORS политики
app.use(cors());
app.use(express.json());

// запуск сервера
const server = app.listen(PORT, () => {
  console.log(`app listening at ${HOST}:${PORT}`);
});

const CURRENT_GAME_PATH = __dirname + "/../private/current_game.json";
const GAMES_PATH = __dirname + "/../private/games";

const ROOM_NAMES = {
  main: "main",
  pending: "pending",
};

// ---------

const currentGame = JSON.parse(fs.readFileSync(CURRENT_GAME_PATH));
const gameSave = new SaveManager(`${GAMES_PATH}/${currentGame.name}.json`);
const cm = new ConnectionManager(server, gameSave, ROOM_NAMES);
const game = new Game(cm, gameSave);

game.start();
