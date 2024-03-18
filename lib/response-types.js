const Discord = require('discord.js');

const manamoji = require('./middleware/manamoji');

class TextResponse {

  constructor(client, cardName) {
    this.client = client;
    this.cardName = null;
    this.set = null;
    this.number = null;
    [this.cardName, this.set, this.number] = cardName.split('|').map(f => f ? f.trim() : f);

    this.middleware = [ manamoji ];
    this.url = 'https://api.scryfall.com/cards/';
  }

  makeQuerystring() {
    const querystring = {
      fuzzy: this.cardName,
      format: 'json'
    };

    if (this.set) {
      querystring.set = this.set;
    }

    return querystring;
  }

  makeUrl() {
    const url = new URL(this.url);

    if (this.set && this.number) {
      url.pathname += `${this.set}/${this.number}`.toLowerCase();
    } else {
      url.pathname += 'named';
    }

    const querystringParts = this.makeQuerystring();

    for (let key in querystringParts) {
      if (querystringParts.hasOwnProperty(key)) {
        url.searchParams.append(key, querystringParts[key]);
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

  makeEmbeds(json) {
    if (json.hasOwnProperty('card_faces')) {
      return [
        new Discord.EmbedBuilder()
          .setTitle(`${json.name} ${json.mana_cost}`)
          .setDescription(`${json.type_line}\n${json.oracle_text}`)
          .setURL(json.scryfall_uri)
          .setThumbnail(json.card_faces[0].large ?? json.card_faces[0].normal ?? json.card_faces[0].small),
        new Discord.EmbedBuilder()
          .setTitle(`${json.name} ${json.mana_cost}`)
          .setDescription(`${json.type_line}\n${json.oracle_text}`)
          .setURL(json.scryfall_uri)
          .setThumbnail(json.card_faces[1].large ?? json.card_faces[1].normal ?? json.card_faces[1].small),
      ];
    }

    return [new Discord.EmbedBuilder()
      .setTitle(`${json.name} ${json.mana_cost}`)
      .setDescription(`${json.type_line}\n${json.oracle_text}`)
      .setURL(json.scryfall_uri)
      .setThumbnail(json.image_uris.large ?? json.image_uris.normal ?? json.image_uris.small)
    ];
  }

  embed() {
    return new Promise((resolve, reject) => {
      this.makeRequest().then(response => {
        let embeds = this.makeEmbeds(response);
        this.middleware.length > 0 && this.middleware.forEach(mw => {
          embeds = mw(this.client, embeds);
        });
        resolve(embeds);
      });
    });
  }
}

class ImageResponse extends TextResponse {
  makeEmbeds(json) {
    if (json.hasOwnProperty('card_faces')) {
      return [
        new Discord.EmbedBuilder()
          .setTitle(`${json.name} ${json.card_faces[0].mana_cost}`)
          .setURL(json.scryfall_uri)
          .setImage(json.card_faces[0].image_uris.large ?? json.card_faces[0].image_uris.normal ?? json.card_faces[0].image_uris.small),
        new Discord.EmbedBuilder()
          .setURL(json.scryfall_uri)
          .setImage(json.card_faces[1].image_uris.large ?? json.card_faces[1].image_uris.normal ?? json.card_faces[1].image_uris.small),
      ];
    }

    return [new Discord.EmbedBuilder()
      .setTitle(json.name)
      .setURL(json.scryfall_uri)
      .setImage(json.image_uris.large ?? json.image_uris.normal ?? json.image_uris.small)
    ];
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

  makeEmbeds(json) {
    return [new Discord.EmbedBuilder()
      .setTitle(`Rulings for ${json.name}`)
      .setFields(...json.data.map(item => {
        return {
          name: item.published_at,
          value: item.comment,
        }
      }))
      .setURL(json.scryfall_uri)
    ];
  }
}

class LegalityResponse extends TextResponse {
  legalityMap = {
    legal: 'Legal',
    not_legal: 'Not Legal',
    banned: 'Banned',
    restricted: 'Restricted',
  };

  formatMap = {
    standard: 'Standard',
    alchemy: 'Alchemy',
    pioneer: 'Pioneer',
    explorer: 'Explorer',
    modern: 'Modern',
    brawl: 'Brawl',
    legacy: 'Legacy',
    historic: 'Historic',
    vintage: 'Vintage',
    pauper: 'Pauper',
    commander: 'Commander',
    penny: 'Penny',
    oathbreaker: 'Oathbreaker',
  };

  makeEmbed(json) {
    return new Discord.EmbedBuilder()
      .setTitle(`${json.name} Legality`)
      .setFields(Object.entries(this.formatMap).map(([key, label]) => {
        return {
          name: label,
          value: this.legalityMap[json.legalities[key]],
          inline: true,
        }
      }))
      .setURL(json.scryfall_uri)
    ;
  }
}

module.exports = {
  TextResponse,
  ImageResponse,
  RulingResponse,
  LegalityResponse,
};
