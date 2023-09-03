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
        <div>
          CLIENT: {{ contractStore.selectedContract.data[0] === web3Store.account ? 'You' : contractStore.selectedContract.data[0] }}
          <q-btn icon="mail" color="green" @click="message(contractStore.selectedContract.data[0])">Message</q-btn>
        </div>
        <div v-if="contractStore.selectedContract.data[1] !== '0x0000000000000000000000000000000000000000'">
          REPORTER: {{ contractStore.selectedContract.data[1] === web3Store.account ? 'You' : contractStore.selectedContract.data[1] }}
          <q-btn icon="mail" color="green" @click="message(contractStore.selectedContract.data[1])">Message</q-btn>
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
      <q-card-section>
        <q-form @submit="onSubmit">
          <q-input v-model="email"
                   label="Enter an email for contract updates"
                   type="email"
                   outlined
                   bottom-slots
                   @blur="updateEmailVerification"
                   autofocus
                   :error="showError"
                   error-message="Please enter a valid email address."
          >
            <template v-slot:error>
              Must be a valid email address.
            </template>
          </q-input>
          <q-btn
            color="primary"
            @click="onSubmit" flat
            :disabled="!emailValid"
          >Subscribe</q-btn>
        </q-form>
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
import {useMessageStore} from "stores/message-store";
import MediaDisplay from "components/MediaDisplay.vue";

import {useQuasar} from "quasar";
import {api} from "boot/axios";
//:url="`http://localhost:3000/upload/contractAddress/${contractStore.selectedContract.address}`"
export default defineComponent({
  name: "SelectedContractDialog",
  components: {MediaDisplay},
  setup(props, context) {
    const $q = useQuasar();
    const contractStore = useContractStore();
    const web3Store = useWeb3Store();
    const messageStore = useMessageStore();
    const isCustomer = (contract) => contract.data[0].toLowerCase() === web3Store.account.toLowerCase();
    const isReporter = (contract) => contract.data[1].toLowerCase() === web3Store.account.toLowerCase();
    const fulfillmentFields = ref(false);
    const fulfillmentNotes = ref('');
    const email = ref('');
    const emailValid = ref(false);
    const showError = ref(false);

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

    const onSubmit = async () => {
      try{
        await api.post('/contractSubscriptions', {
          email: email.value,
          contractAddress: contractStore.selectedContract.address
        })
        $q.notify({
          color: "green-4",
          textColor: "white",
          message: "Email subscribed successfully"
        });
        email.value = ''
      }
      catch(e){
        console.log(e)
        $q.notify({
          color: "red-4",
          textColor: "white",
          icon: "error_outline",
          message: "Subscription failed"
        });
      }
    }

    const updateEmailVerification = () => {
      let reg =  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,24}))$/
      let valid = reg.test(email.value)
      if (valid) {
        console.log('email is valid')
        emailValid.value = true
        showError.value = false
      } else {
        console.log('email invalid')
        emailValid.value = false
        showError.value = true
      }
    }

    const message = async (address) => {
      messageStore.newMessage.contract = contractStore.selectedContract.id;
      messageStore.newMessage.to = address;
      messageStore.newMessage.from = web3Store.account;
      messageStore.newMessage.title = `Re: ${contractStore.selectedContract.data[3]} `;
      messageStore.setMessageDialog(true);
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
      onFileUpload,
      email,
      onSubmit,
      emailValid,
      showError,
      updateEmailVerification,
      message
    }
  }
})
</script>

<style scoped>

</style>
