const Discord = require('discord.js');
const Servo = require('./lib/bot');

if (!process.env.DISCORD_TOKEN) {
  console.log('Error: Specify DISCORD_TOKEN in environment');
  process.exit(1);
}

new Servo(process.env.DISCORD_TOKEN);
