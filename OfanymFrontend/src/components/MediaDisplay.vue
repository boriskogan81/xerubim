<template>
  <div v-if="files.length && reporter && isCustomer(contractStore.selectedContract)">
    <q-card-section v-for="(file, index) in files" :key="index">
      <div class="text-subtitle1">From {{ reporter }}</div>
      <div class="text-subtitle2">File {{ index + 1 }}</div>
      <q-input filled v-model="passphrase" label="Your passphrase" />
      <div>Enter your contract passphrase for file decryption.</div>
      <q-btn @click="saveFile(file)">Download</q-btn>
    </q-card-section>
  </div>
</template>

<script>
import {
  ref,
  defineComponent,
  onMounted
} from "vue";
import {api, axios} from 'boot/axios';
import {useContractStore} from "stores/contract-store";
import {useWeb3Store} from "stores/web3-store";
import {useQuasar} from "quasar";
import { Buffer } from "buffer";
import { createWriteStream } from 'streamsaver';
import toBuffer from 'typedarray-to-buffer';
import { createDecipheriv } from 'browser-crypto';
import { S3Client, GetObjectTaggingCommand } from "@aws-sdk/client-s3";
import s3Config from '../../config/s3.json';
import * as openpgp from 'openpgp';

const crypto = window.crypto;
const client = new S3Client({
  region: s3Config.region,
  bucket: s3Config.bucket,
  credentials: {
    accessKeyId: s3Config.accessKeyId,
    secretAccessKey: s3Config.secretAccessKey
  } });

export default defineComponent({
  name: "MediaDisplay",
  setup() {
    const $q = useQuasar();
    const contractStore = useContractStore();
    const web3Store = useWeb3Store();
    const account = ref("");
    const isCustomer = contract =>  contract && contract.data[0] && (contract.data[0].toLowerCase() === web3Store.account.toLowerCase());
    const isReporter = contract => contract && contract.data[1] && (contract.data[1].toLowerCase() === web3Store.account.toLowerCase());
    const selectedContract = ref(contractStore.selectedContract);
    const reporter = ref("");
    const files = ref([]);
    let buyerEncryptedKey = null;
    let passphrase = ref("");
    let buyerDecryptedKey = null;

    onMounted(async () => {
      window.Buffer = window.Buffer || Buffer;
      // files.value = [];
      const accounts = await window.ethereum.request({method: 'eth_requestAccounts'});
      account.value = accounts[0];
      if (contractStore.selectedContract.data[1]) {
        reporter.value = contractStore.selectedContract.data[1];
      }

      if (contractStore.selectedContract.data[11]) {
        files.value = contractStore.selectedContract.data[11];
      }
      console.log(contractStore.selectedContract.data[11])
    })
    let authTagString, ivString, keyString;

    const retrieveBuyerEncryptedKey = async () => {
      try{
        const encryptedKey = await api.get('/buyerEncryptedKey', {
          params: {
            contractAddress: contractStore.selectedContract.address,
          }
        })
        buyerEncryptedKey = await openpgp.readMessage({
          armoredMessage: encryptedKey.data.buyerEncryptedKey
        })
        const buyerPublicKey = await openpgp.readKey({ armoredKey: encryptedKey.data.buyerPublicKey});

        const buyerPrivateKey = await openpgp.decryptKey({
          privateKey: await openpgp.readPrivateKey({ armoredKey: encryptedKey.data.buyerPrivateKey }),
          passphrase: passphrase.value
        });
        const { data: decrypted } = await openpgp.decrypt({
          message: buyerEncryptedKey,
          verificationKeys: buyerPublicKey,
          decryptionKeys: buyerPrivateKey
        });
        buyerDecryptedKey = decrypted;
        return decrypted;
      }
      catch (e) {
        console.log("retrieveBuyerEncryptedKey error: ", e)
        $q.notify({
          color: "red-5",
          textColor: "white",
          icon: "warning",
          message: "Decryption failed, please check passphrase"
        });
      }
    }

    const saveFile = async(fileKey) => {
      try{
        const input = {
          "Bucket": s3Config.bucket,
          "Key": fileKey
        };
        const command = new GetObjectTaggingCommand(input);
        const response = await client.send(command);
        authTagString = response.TagSet[0].Value;
        ivString = response.TagSet[1].Value;
        buyerDecryptedKey = await retrieveBuyerEncryptedKey();
        await downloadFile(s3Config.endpoint + fileKey, 'testDecrypt.jpg', buyerDecryptedKey, ivString, authTagString);
      }
      catch (e) {
        console.log("saveFile error: ", e)
      }
    }

    const downloadFile = (url, fileName, keyString, ivString, authTagString) => {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        Buffer.from(keyString, 'base64'),
        Buffer.from(ivString, 'base64')
      );

      decipher.setAuthTag(Buffer.from(authTagString, 'base64'));

      return fetch(url).then(res => {
        const fileStream = createWriteStream(fileName);
        const contentLength = res.headers['Content-Length'];
        const writer = fileStream.getWriter();
        let totalBytesRead = 0;
        const decrypt =  new TransformStream({
          transform: async (chunk, controller) => {
            try {
              chunk = Buffer.from(chunk.buffer);
              console.log("chunk: ", chunk)
            } catch (err) {
              console.error(err);
            }

            // Decrypt chunk and send it out
            const decryptedChunk = decipher.update(chunk);
            controller.enqueue(decryptedChunk);

            // Emit a progress update
            totalBytesRead += chunk.length;
            emitProgress(totalBytesRead, contentLength, url);
          },
        })

        if (res.body.pipeTo && res.body.pipeThrough) {
          writer.releaseLock();
          return res.body
            .pipeThrough(decrypt)
            .pipeTo(fileStream);
        }

        const reader = res.body.getReader();
        const pump = () =>
          reader
            .read()
            .then(({ value, done }) => (done ? writer.close() : writer.write(value).then(pump)));
        return pump();
      });
    };

    const emitProgress = (totalBytesRead, contentLength, url) => {
      const percent = Math.round((totalBytesRead / contentLength) * 100);
      const event = new CustomEvent(url, {
        detail: {
          percent,
          totalBytesRead,
          contentLength,
        },
      });
      window.dispatchEvent(event);
    }


    return {
      ref,
      contractStore,
      isReporter,
      isCustomer,
      account,
      files,
      reporter,
      selectedContract,
      saveFile,
      retrieveBuyerEncryptedKey,
      passphrase
    }
  }

})
</script>

<style scoped>

</style>
