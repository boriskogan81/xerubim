<template>
  <q-card-section>
    <div>This contract has the following files:</div>
    <div v-for="file of files" :key="file.cid">
      <q-btn :href="file.url"  @click.prevent="downloadItem(file.url)"> {{file.cid}}</q-btn>
    </div>
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

const account = ref();
const client = ref();
const files = ref()
const getAccessToken = () => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDI2RWE4N2I3OTlEY2QyYWFBNDBGQzFkMjNlOWM5MEZkZDMyM0E3NjMiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NjMyNDkzMjgwMjcsIm5hbWUiOiJYZXJ1YmltU2FuZGJveCJ9.9PiUVskWavMIJcOvHkBspvvQNGM2QaN0m3rxr19D8fE';

const makeStorageClient = () => new Web3Storage({ token: getAccessToken() });

export default defineComponent ({
  name: "MediaDisplay",
  setup() {
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

        await Promise.all(contractStore.selectedContract.data[11].map(async (cid) =>{
          try{
            console.log(cid)
            const retrieved = await client.get(cid);
            console.log(retrieved)
            const info = await client.status(cid);
            console.log(info)
            const retrievedFiles = await retrieved.files();
            console.log(retrievedFiles)
            files.value.push({
              files: retrievedFiles
            })
          }catch (e) {
            console.log(e)
          }

        }))
      }
    });

    const downloadItem = async (url) => {
      const response = await axios.get(url, {responseType: 'blob'});
      saveAs(response.data, url);
    }
    return {
      ref,
      contractStore,
      isReporter,
      isCustomer,
      files,
      downloadItem
    }
  }

})
</script>

<style scoped>

</style>
