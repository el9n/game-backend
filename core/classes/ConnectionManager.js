const socketio = require("socket.io");
const { PLAYER_COLORS } = require("../appearance");
const Player = require("./entities/Player");

module.exports = class ConnectionManager {
  constructor(server, game, roomNames) {
    this.game = game;
    this.roomNames = roomNames;

    // игроки
    this.players = Object.entries(this.game.players).map(
      ([letter, name]) => new Player(letter, name, PLAYER_COLORS[letter])
    );
    // подключенные игроки из массива players
    this.connected = [];

    // открыть соединение
    this.io = socketio(server, { cors: { origin: "*" } });
    this.mainNamespace = this.io.of("/").adapter;

    // ивенты
    this.#setUpRoomEvents();
    this.#syncConnected();

    // подключение
    this.io.on("connection", (user) => {
      this.log("new client connected!");

      // поместить нового пользователя в комнату ожидания
      user.join(this.roomNames.pending);

      this.#setUpUserEvents(user);
    });
  }

  onRoomEvent(room, eventName, callback, namespace = this.io.of("/").adapter) {
    let name = room;

    // если передан объект комнаты
    if (room instanceof Object) {
      const [roomName] = room.rooms;
      name = roomName;
    }

    namespace.on(eventName + "-room", (currentRoom, id) => {
      if (currentRoom !== name) return;

      callback(currentRoom, id);
    });
  }

  #setUpUserEvents(user) {
    user.on("choose_player", async (letter) => {
      // если у пользователя уже есть имя или выбранное имя не доступно
      if (
        user.letter ||
        !(await this.getAvalivableLetters()).includes(letter)
      ) {
        return;
      }

      user.letter = letter;
      this.move(user, this.roomNames.main);
      user.emit("get_letter", letter);
    });
  }

  #setUpRoomEvents() {
    // присоединение к комнате ожидания
    this.onRoomEvent(this.roomNames.pending, "join", async (room, id) => {
      console.log(`a user connected to the pending room`);

      const user = this.getUserById(id);
      const avalivableLetters = this.getAvalivableLetters();

      // отправить ответ пользователю
      user.emit("players", this.players);
      user.emit(
        "connected_players",
        (await this.getMainRoomUsers())
          .map((user) => user.letter)
          .map((letter) =>
            this.players.find((player) => player.letter === letter)
          )
      );
    });

    // присоединение к главной комнате
    this.onRoomEvent(this.roomNames.main, "join", async (room, id) => {
      const user = this.getUserById(id);

      user.emit("game", this.game.options);

      // получить всех пользователей комнаты
      const players = await this.getMainRoomUsers();

      console.log(`${user.letter} has joined the ${room} room`);
      console.log(
        `${players.length} user(s) in the ${room} room: ${players.map(
          (player) => player.name
        )}`
      );
    });

    // отключение от главной комнаты
    this.onRoomEvent(this.roomNames.main, "leave", async (room, id) => {
      const user = this.getUserById(id);

      user.emit("get_letter", null);

      // получить всех пользователей комнаты
      const players = await this.getMainRoomUsers();

      console.log(`${user.letter} left the ${room} room`);
      console.log(
        `${players.length} user(s) in the ${room} room: ${players.map(
          (player) => player.name
        )}`
      );
    });
  }

  #syncConnected() {
    // подключение пользователя
    this.onRoomEvent(this.roomNames.main, "join", (room, id) => {
      const user = this.getUserById(id);

      const player = this.players.find(
        (player) => player.letter === user.letter
      );
      if (player) {
        this.connected.push(player);
      }

      this.io.sockets.emit("connected_players", this.connected);
    });

    // отключение пользователя
    this.onRoomEvent(this.roomNames.main, "leave", (room, id) => {
      const user = this.getUserById(id);

      this.connected = this.connected.filter(
        (connectedPlayer) => connectedPlayer.letter !== user.letter
      );

      this.io.sockets.emit("connected_players", this.connected);
    });
  }

  log(message) {
    console.log(message);
  }

  getUserById(id) {
    return this.io.sockets.sockets.get(id);
  }

  // переместить пользователя в другую комнату
  move(user, room) {
    for (const room of user.rooms) {
      user.leave(room);
    }

    user.join(room);
  }

  // получить подключенных к главной комнате игроков
  async getMainRoomUsers() {
    return await this.io.to(this.roomNames.main).fetchSockets();
  }

  async getAvalivableLetters() {
    const players = await this.getMainRoomUsers();
    const avalivableLetters = Object.keys(this.game.players);

    // убрать занятые имена из пула доступных имен
    players.forEach((player) => {
      const index = avalivableLetters.indexOf(player.name);
      if (index > -1) {
        avalivableLetters.splice(index, 1);
      }
    });

    return avalivableLetters;
  }

  get mainRoom() {
    return this.io.to(this.roomNames.main);
  }
};
