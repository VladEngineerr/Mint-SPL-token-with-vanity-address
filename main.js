const { createUmi } = require("@metaplex-foundation/umi-bundle-defaults");
const {
  generateSigner,
  signerIdentity,
  createSignerFromKeypair,
  transactionBuilder,
} = require("@metaplex-foundation/umi");
const {
  mplTokenMetadata,
  createV1,
  mintV1,
  TokenStandard,
} = require("@metaplex-foundation/mpl-token-metadata");
const { createGenericFile } = require("@metaplex-foundation/umi");
const bs58 = require("bs58");
const fs = require("fs");
const { hosueKey, tokenKey } = require("./secret");
const { irysUploader } = require("@metaplex-foundation/umi-uploader-irys");

const MINT_CONFIG = {
  numDecimals: 6,
  numberTokens: 30000,
};

const genericFile = createGenericFile(
  fs.readFileSync("./assets/DB.png"),
  "DB.png",
  { contentType: "image/png" }
);
const endpoint = "https://api.devnet.solana.com";
// const endpoint = "https://api.mainnet-beta.solana.com";


console.log(endpoint)

const umi = createUmi(endpoint)
  .use(mplTokenMetadata())
  .use(irysUploader({
    // mainnet address: "https://node1.irys.xyz"
    // devnet address: "https://devnet.irys.xyz"
    address: "https://devnet.irys.xyz",
  }));
const keypair = umi.eddsa.createKeypairFromSecretKey(bs58.decode(hosueKey));
const myKeypairSigner = createSignerFromKeypair(umi, keypair);
umi.use(signerIdentity(myKeypairSigner));

const tokenKeypair = umi.eddsa.createKeypairFromSecretKey(bs58.decode(tokenKey));
const tokenKeypairSigner = createSignerFromKeypair(umi, tokenKeypair);

const tokenMetadata = {
  name: "DGBID",
  symbol: "DB",
  description:
    "BID is the native token of the Degen Bid platform and is used as the currency for bidding on auctions. Each $BID token is equivalent to one bid on a Penny Auction, providing a simple and easy-to-use currency for participating in auctions.",
  image: "",
};

const uploadMetadata = async () => {
  const [imageUri] = await umi.uploader.upload([genericFile]);
  tokenMetadata.image = imageUri;
  const uri = await umi.uploader.uploadJson(tokenMetadata);
  console.log("token metadata uri:", uri);
  return uri;
};

const mint = async ({ uri }) => {
  const signer = generateSigner(umi); //devnet
  // const signer = tokenKeypairSigner; //mainnet
  console.log('signer', signer);
  const tx = await transactionBuilder()
    .add(
      createV1(umi, {
        mint: signer,
        authority: umi.identity,
        name: tokenMetadata.name,
        uri: uri,
        sellerFeeBasisPoints: 0,
        tokenStandard: TokenStandard.Fungible,
      })
    )
    .add(
      mintV1(umi, {
        mint: signer.publicKey,
        authority: umi.identity,
        amount: MINT_CONFIG.numberTokens,
        tokenOwner: keypair.publicKey,
        tokenStandard: TokenStandard.NonFungible,
      })
    )
    .sendAndConfirm(umi, { send: { commitment: "finalized" } });
  console.log("New token minted", signer.publicKey);
};

const main = async () => {
  console.log("=====Mint SPL TOKEN=====");

  console.log("   Step 1: Uploading metadata");
  const metadataUri = await uploadMetadata();

  console.log("   Step 2: Minting token");
  await mint({ uri: metadataUri });
};

main();