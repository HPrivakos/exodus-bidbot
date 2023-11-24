import { Client, EmbedBuilder, TextChannel } from "discord.js"
import { ethers } from "ethers";
import abi from "./abi"
const provider = new ethers.WebSocketProvider(process.env.WS_PROVIDER!)

const contract = new ethers.Contract("0x0ff58e235b154dd7785c4829d48948ce114248c4", abi, provider)

provider.on("block", async (blockNumber) => {
  // Do nothing, just keep the connection alive 
  blockNumber
})

const discordClient = new Client({ intents: [] })
discordClient.login(process.env.DISCORD_TOKEN).then(async () => {
  console.log("Logged in")
  const channel = await discordClient.channels.fetch(process.env.CHANNEL_ID!)
  contract.on("AuctionBid", async (tokenId, sender, value, extended) => {
    await newBid(channel as TextChannel, tokenId, sender, value, extended)
  })
  contract.on("AuctionSettled", async (tokenId, winner, amount) => {
    await auctionWon(channel as TextChannel, tokenId, winner, amount)
  })
  contract.on("AuctionExtended", async (tokenId, endTime) => {
    if (channel instanceof TextChannel) {
      await channel.send(`Auction for parcel ${toCoords(tokenId.toString()).join(',')} has been extended to <t:${endTime}>`)
    }
  })
})

async function newBid(channel: TextChannel, tokenId: number, sender: string, value: bigint, extended: boolean) {
  const embed = new EmbedBuilder()
    .setColor("#00FF00")
    .setTitle("New bid")
    .addFields([
      {
        name: "Coordinates",
        value: "Parcel " + toCoords(tokenId.toString()).join(','),
        inline: true
      },
      {
        name: "Bid",
        value: +((+ethers.formatEther(value)).toFixed(2)) + " MANA",
        inline: true
      },
      {
        name: "Bidder",
        value: sender,
      }
    ])
    .setFooter({ text: "Exodus.Town Auction", iconURL: "https://github.com/exodus-town.png" })
    .setTimestamp(new Date())

  if (extended) {
    /*
    embed.addFields([
      {
        name: "Timer extended",
        value: "The timer has been extended by 5 minutes to <t:1700167155>",
      }
    ])
    */
  }


  const fetchProfile = await fetch(`https://peer.decentraland.org/content/entities/profile?pointer=${sender}`)
  const profile = await fetchProfile.json()

  if (profile[0] && profile[0].content) {
    console.log(profile[0].content);

    const face = profile[0].content.find((a: any) => a.file == "face256.png")
    if (face) {
      embed.setAuthor({ iconURL: `https://peer.decentraland.org/content/contents/${face.hash}`, name: profile[0].metadata.avatars[0].name + (profile[0].metadata.avatars[0].hasClaimedName ? "" : `#${sender.toLowerCase().slice(-4)}`) })
    }
  }
  else {
    embed.setAuthor({ name: `${sender.slice(0, 8)}...${sender.slice(-6)}` })
  }

  console.log(embed.toJSON());



  if (channel instanceof TextChannel) {
    await channel.send({ embeds: [embed] })
  }

}

async function auctionWon(channel: TextChannel, tokenId: number, sender: string, value: bigint) {
  const embed = new EmbedBuilder()
    .setColor("#FF0000")
    .setTitle("Auction won")
    .addFields([
      {
        name: "Coordinates",
        value: "Parcel " + toCoords(tokenId.toString()).join(','),
        inline: true
      },
      {
        name: "Final bid",
        value: +((+ethers.formatEther(value)).toFixed(2)) + " MANA",
        inline: true
      },
      {
        name: "Winner",
        value: sender,
      }
    ])
    .setFooter({ text: "Exodus.Town Auction", iconURL: "https://github.com/exodus-town.png" })
    .setTimestamp(new Date())

  const fetchProfile = await fetch(`https://peer.decentraland.org/content/entities/profile?pointer=${sender}`)
  const profile = await fetchProfile.json()

  if (profile[0] && profile[0].content) {
    console.log(profile[0].content);

    const face = profile[0].content.find((a: any) => a.file == "face256.png")
    if (face) {
      embed.setAuthor({ iconURL: `https://peer.decentraland.org/content/contents/${face.hash}`, name: profile[0].metadata.avatars[0].name + (profile[0].metadata.avatars[0].hasClaimedName ? "" : `#${sender.toLowerCase().slice(-4)}`) })
    }
  }
  else {
    embed.setAuthor({ name: `${sender.slice(0, 8)}...${sender.slice(-6)}` })
  }

  console.log(embed.toJSON());



  if (channel instanceof TextChannel) {
    await channel.send({ embeds: [embed] })
  }

}

export function toCoords(tokenId: number | string): [number, number] {
  const id = typeof tokenId === "string" ? Number(tokenId) : tokenId;
  if (isNaN(id)) {
    throw new Error(`Invalid tokenId=${tokenId}`);
  }
  if (id < 0) {
    throw new Error(`Invalid tokenId can't be less than 0`);
  }
  const dx = [1, 0, -1, 0];
  const dy = [0, 1, 0, -1];
  let x = 0;
  let y = 0;
  let turn = 0;
  let step = 0;
  let length = 1;
  let increase = false;
  while (step < id) {
    for (let i = 0; i < length; i++) {
      x += dx[turn % 4];
      y += dy[turn % 4];
      step++;
      if (step === id) break;
    }
    if (increase) {
      length++;
      increase = false;
    } else {
      increase = true;
    }
    turn++;
  }
  return [x, y];
}
