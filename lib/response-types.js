const Discord = require('discord.js');

const manamoji = require('./middleware/manamoji');

class TextResponse {
  constructor(client, cardName) {
    this.client = client;
    this.cardName = cardName;
  }

  makeQuerystring() {
    return {
      fuzzy: this.cardName,
      format: 'text'
    };
  }

  makeUrl() {
    const url = new URL(this.url);
    const querystrings = this.makeQuerystring();

    for (let key in querystrings) {
      if (querystrings.hasOwnProperty(key)) {
        url.searchParams.append(key, querystrings[key]);
      }
    }

    return url.toString();
  }

  makeRequest() {
    let headers = null;

    return new Promise((resolve, reject) => {
      fetch(this.makeUrl())
      .then(response => {
        headers = response.headers;

        return response.text();
      })
      .then(text => {
        resolve({ body: text, headers: headers });
      }).catch(err => {
        resolve(err.response);
      });
    });
  }

  makeEmbed(response) {
    let parts = response.body.split('\n');
    const embedTitle = parts.shift();

    return new Discord.EmbedBuilder()
      .setTitle(`${embedTitle}`)
      .setDescription(parts.join('\n'))
      .setURL(response.headers.get('x-scryfall-card'))
      .setThumbnail(response.headers.get('x-scryfall-card-image'))
    ;
  }

  embed() {
    return new Promise((resolve, reject) => {
      this.makeRequest().then(response => {
        let embed = this.makeEmbed(response);
        this.middleware.length > 0 && this.middleware.forEach(mw => {
          embed = mw(this.client, embed);
        });
        resolve(embed);
      });
    });
  }
}

TextResponse.prototype.middleware = [ manamoji ];
TextResponse.prototype.url = 'https://api.scryfall.com/cards/named';

class ImageResponse extends TextResponse {
  makeEmbed(response) {
    let parts = response.body.split('\n');

    return new Discord.EmbedBuilder()
      .setTitle(parts[0].match(/^([^{]+)/)[0].trim())
      .setURL(response.headers.get('x-scryfall-card'))
      .setImage(response.headers.get('x-scryfall-card-image'))
    ;
  }
}


module.exports = { TextResponse, ImageResponse };
