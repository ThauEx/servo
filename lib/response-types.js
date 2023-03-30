const Discord = require('discord.js');

const manamoji = require('./middleware/manamoji');

class TextResponse {

  constructor(client, cardName) {
    this.client = client;
    this.cardName = cardName;

    this.middleware = [ manamoji ];
    this.url = 'https://api.scryfall.com/cards/named';
  }

  makeQuerystring() {
    return {
      fuzzy: this.cardName,
      format: 'json'
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
    return new Promise((resolve, reject) => {
      fetch(this.makeUrl())
      .then(response => resolve(response.json()))
      .catch(err => {
        resolve(err.response);
      });
    });
  }

  makeEmbed(json) {
    return new Discord.EmbedBuilder()
      .setTitle(`${json.name} ${json.mana_cost}`)
      .setDescription(parts.join('\n'))
      .setURL(json.scryfall_uri)
      .setThumbnail(json.image.uris.large)
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

class ImageResponse extends TextResponse {
  makeEmbed(json) {
    return new Discord.EmbedBuilder()
      .setTitle(json.name)
      .setURL(json.scryfall_uri)
      .setThumbnail(json.image.uris.large)
    ;
  }
}

class RulingResponse extends TextResponse {
  makeRequest() {
    return new Promise((resolve, reject) => {
      fetch(this.makeUrl())
      .then(response => response.json())
      .then(json => {
        return fetch(json.rulings_uri)
        .then(rulingResponse => rulingResponse.json())
        .then(rulingJson => resolve({
          ...rulingJson,
          name: json.name,
          scryfall_uri: json.scryfall_uri
        }))
        .catch(err => {
          resolve(err.response);
        });
      })
      .catch(err => {
        resolve(err.response);
      });
    });
  }

  makeEmbed(json) {
    return new Discord.EmbedBuilder()
      .setTitle(`Rulings for ${json.name}`)
      .setFields(...json.data.map(item => {
        return {
          name: `**${item.published_at}**`,
          value: item.comment,
        }
      }))
      .setURL(json.scryfall_uri)
    ;
  }
}

module.exports = { TextResponse, ImageResponse, RulingResponse };
