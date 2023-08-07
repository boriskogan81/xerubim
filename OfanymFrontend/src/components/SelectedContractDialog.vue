<template>
  <q-card style="min-width: 30vw">
    <q-card v-if="contractStore.selectedContract">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ contractStore.selectedContract.task && contractStore.selectedContract.task }}</div>
        <q-space/>
        <q-btn icon="close" flat round dense v-close-popup/>
      </q-card-section>
      <q-card-section>
        <div>TASK: {{ contractStore.selectedContract.data[3] }}</div>
        <div class="text-uppercase">Pay: {{ web3Store.fromWei(contractStore.selectedContract.data[2])}} eth
        </div>
        <div class="text-uppercase">Expires:
          {{
            new Date(parseInt(contractStore.selectedContract.data[5]) * 1000)
              .toLocaleDateString(undefined,
                {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})
          }}
        </div>
        <div>FORMAT: {{ contractStore.selectedContract.data[4] }}</div>
        <div>MINIMAL LENGTH:
          {{ `${contractStore.selectedContract.data[7]} minute${parseInt(contractStore.selectedContract.data[7]) > 1 ? "s" : ""}` }}
        </div>
        <div>MINIMAL RESOLUTION:
          {{ contractStore.selectedContract.data[9] }}
        </div>
        <div :class="contractStore.selectedContract.data[6] === 'open' && 'active'">
          STATUS: {{ contractStore.selectedContract.data[6] }}
        </div>
        <div v-if="contractStore.selectedContract.data[6] === 'proposed' && isCustomer(contractStore.selectedContract)">
          MEDIA:
          <MediaDisplay />
        </div>
      </q-card-section>
      <q-card-actions>
        <q-btn v-if="contractStore.selectedContract.data[6] === 'open'" flat @click="fulfillmentFields = !fulfillmentFields">Fill Contract</q-btn>
        <q-btn v-if="contractStore.selectedContract.data[6] === 'proposed' && isCustomer(contractStore.selectedContract)" flat @click="acceptProposal">Accept Proposal</q-btn>
        <q-btn v-if="contractStore.selectedContract.data[6] === 'proposed' && isCustomer(contractStore.selectedContract)" flat @click="disputeProposal">Dispute Proposal</q-btn>

      </q-card-actions>
      <q-card-section v-if="contractStore.selectedContract.data[6] === 'open'" class="q-pa-lg">
        <q-input outlined v-model="fulfillmentNotes" label="Please add notes on the contract" style="width: auto"/>
        <q-uploader
          :url="`http://localhost:3000/uploadPlain/?address=${contractStore.selectedContract.address}`"
          label="Upload video/photo files"
          multiple
          batch
          style="margin: 2em; width: auto;"
          :form-fields="[{name: 'notes', value: fulfillmentNotes}]"
          @uploaded="onFileUpload"
          ref="uploader"
        />
      </q-card-section>
    </q-card>
  </q-card>

</template>

<script>
import {
  defineComponent,
  ref
} from "vue";
import {useWeb3Store} from "stores/web3-store";
import {useContractStore} from "stores/contract-store";
import MediaDisplay from "components/MediaDisplay.vue";

import {useQuasar} from "quasar";
//:url="`http://localhost:3000/upload/contractAddress/${contractStore.selectedContract.address}`"
export default defineComponent({
  name: "SelectedContractDialog",
  components: {MediaDisplay},
  setup(props, context) {
    const $q = useQuasar();
    const contractStore = useContractStore();
    const web3Store = useWeb3Store();
    const isCustomer = (contract) => contract.data[0].toLowerCase() === web3Store.account.toLowerCase();
    const isReporter = (contract) => contract.data[1].toLowerCase() === web3Store.account.toLowerCase();
    const fulfillmentFields = ref(false);
    const fulfillmentNotes = ref('');
    const acceptProposal = async() => {
      const dismiss = $q.notify({
        spinner: true,
        message: 'Please wait, accepting the proposal',
        timeout: 100000
      });
      try{
        await web3Store.acceptProposal(contractStore.selectedContract.address);
        await contractStore.updateQuery({...contractStore.contractQuery});
        context.emit('closeContractDialog');
        dismiss();
        $q.notify({
          color: "green-4",
          textColor: "white",
          message: "Contract acceptance succeeded"
        });
      }
      catch (e){
        dismiss();
        $q.notify({
          color: "red-4",
          textColor: "white",
          icon: "error_outline",
          message: "Contract acceptance failed"
        });
      }
    }
    const onFileUpload = async (info) => {
      console.log(info)
      const dismiss = $q.notify({
        color: "green-5",
        textColor: "white",
        icon: "done",
        message: "Files have been uploaded and are processing"
      });
      try{
        const files = JSON.parse(info.xhr.response).data;
        await web3Store.proposeMedia(contractStore.selectedContract.address, files);
        await contractStore.updateQuery({...contractStore.contractQuery});
        dismiss();
        context.emit('closeContractDialog');
      }
      catch (e) {
        dismiss();
        $q.notify({
          color: "red-4",
          textColor: "white",
          icon: "error_outline",
          message: "File upload failed"
        });
      }

    };

    const disputeProposal = async() => {
      const dismiss = $q.notify({
        spinner: true,
        message: 'Please wait, disputing the proposal',
        timeout: 100000
      });
      try{
        await web3Store.disputeProposal(contractStore.selectedContract.address)
        dismiss();
        $q.notify({
          color: "green-4",
          textColor: "white",
          message: "Contract dispute succeeded"
        });
        await contractStore.updateQuery({...contractStore.contractQuery});
        context.emit('closeContractDialog');
      }
      catch(e){
        dismiss();
        $q.notify({
          color: "red-4",
          textColor: "white",
          icon: "error_outline",
          message: "Contract dispute failed"
        });
      }
    }
    return {
      contractStore,
      web3Store,
      isCustomer,
      isReporter,
      fulfillmentFields,
      fulfillmentNotes,
      acceptProposal,
      disputeProposal,
      onFileUpload
    }
  }
})
</script>

<style scoped>

</style>
