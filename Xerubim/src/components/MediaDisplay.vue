<template>
  <q-card-section >
    <q-btn v-for="(file,index) in files" :key="index" @click="saveFile(file)">
      {{file.name}}
    </q-btn>
  </q-card-section>
</template>

<script>
import {
  ref,
  defineComponent, onMounted
} from "vue";
import {api, axios} from 'boot/axios';
import {useContractStore} from "stores/contract-store";
import { Web3Storage } from 'web3.storage'
import {saveAs} from 'file-saver';
import { create } from 'ipfs-http-client';
import crypto from 'crypto';
import streamSaver from 'streamsaver';
const encoder = new TextEncoder();
const account = ref();
const client = ref();
const files = ref()
const getAccessToken = () => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDI2RWE4N2I3OTlEY2QyYWFBNDBGQzFkMjNlOWM5MEZkZDMyM0E3NjMiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NjMyNDkzMjgwMjcsIm5hbWUiOiJYZXJ1YmltU2FuZGJveCJ9.9PiUVskWavMIJcOvHkBspvvQNGM2QaN0m3rxr19D8fE';
import {useQuasar} from "quasar";

const makeStorageClient = () => new Web3Storage({ token: getAccessToken() });
const fromHexString = (hexString) =>
  Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
export default defineComponent ({
  name: "MediaDisplay",
  setup() {
    const $q = useQuasar();
    const contractStore = useContractStore();
    const isCustomer = (contract, account) => contract.data[0].toLowerCase() === account.value.toLowerCase();
    const isReporter = (contract, account) => contract.data[1].toLowerCase() === account.value.toLowerCase();
    const makeGatewayURL = (cid, path) => {
      return `https://${cid}.ipfs.dweb.link/${encodeURIComponent(path)}`
    }
    const getImageMetadata = async (cid) => {
      try{
        const url = makeGatewayURL(cid, 'metadata.json')
        const res = await fetch(url)
        if (!res.ok) {
          console.log(res)
          throw new Error(`error fetching image metadata: [${res.status}] ${res.statusText}`)
        }
        console.log(res)
        const metadata = await res.json()
        const gatewayURL = makeGatewayURL(cid, metadata.path)
        const uri = `ipfs://${cid}/${metadata.path}`
        return { ...metadata, cid, gatewayURL, uri }
      }
      catch (e) {
        console.log(e)
      }

    }
    onMounted(async() => {
      files.value = [];
      const accounts = await window.ethereum.request({method: 'eth_requestAccounts'});
      account.value = accounts[0];
      const client = makeStorageClient();
      if(contractStore.selectedContract.data[11]){
        const dismiss = $q.notify({
          spinner: true,
          message: 'Please wait, loading media from IPFS',
          timeout: 100000
        });
      try{
        await Promise.all(contractStore.selectedContract.data[11].map(async (cid) =>{

          try{
            const url = 'https://dweb.link/api/v0';
            const ipfs = create({ url });

            const links = [];
            for await (const link of ipfs.ls(cid)) {
              links.push(link);
            }
            const link = links[0]
            const retrieved = await ipfs.cat(cid+'/'+link.name);
            let content = [];
            for await (const chunk of retrieved) {
              content.push((chunk))
            }
            // const encodeKey = encoder.encode('-429438266,-1705669060,-858757535,-542608348,-763346413,-1237531605,1763321242,-1483945493')
            // const alg = { name: 'AES-CTR', counter: fromHexString('45454cc2c79af6f366679fcd7ea9fdb9'), length: 256 };
            // const key = await window.crypto.subtle.importKey(
            //   "raw",
            //   encodeKey,
            //   "AES-CTR",
            //   true,
            //   ["decrypt"])
            //
            // const retrievedBlob = new Blob(content)
            // const decipher = await window.crypto.subtle.decrypt(alg, key, retrievedBlob.arrayBuffer());

            // const input = new ReadableStream(retrieved);
            // const output = streamSaver.createWriteStream(link.name);
            // output.on('finish', function () {
            //   console.log('Decrypted file written to disk!');
            // });
            // //
            // const finished = await input.pipe(decipher).pipe(output);


            // const retrievedFiles = await retrieved.files();
            // console.log('retrieved files:', retrievedFiles)
            files.value.push({
              file: new File(content, link.name, { type: "video/mp4" }),
              name: link.name
            })
          }catch (e) {
            console.log(e)
          }
        }))
        dismiss();
      }
      catch (e){
        console.log(e);
        dismiss();
        $q.notify({
          color: "red-4",
          textColor: "white",
          icon: "error_outline",
          message: "Media download failed"
        });
      }
      }
    });

    const downloadItem = async (url) => {
      const response = await axios.get(url, {responseType: 'blob'});
      saveAs(response.data, url);
    }

    const saveFile = async(file) => {
      const fileHandle = await window.showSaveFilePicker();
      const fileStream = await fileHandle.createWritable();
      await fileStream.write(file.file, {type: "video/mp4"});
      await fileStream.close();
    }
    return {
      ref,
      contractStore,
      isReporter,
      isCustomer,
      files,
      downloadItem,
      saveFile
    }
  }

})
</script>

<style scoped>

</style>
