module.exports = class Action {
  constructor(type, user, options) {
    this.type = type;
    this.user = user;
    this.options = options;
  }
};
