const Discord = require('discord.js');
const Messenger = require('./messenger');

class Servo {
  constructor(token) {
    this.token = token;
    this.client = this.makeClient(token);
  }

  makeClient(token) {
    console.log('servo client init');
    const client = new Discord.Client({
      intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
      ],
    });

    client.on('messageCreate', msg => {
      new Messenger(client, msg);
    });

    client.login(token);

    return client;
  }
}

module.exports = Servo;
