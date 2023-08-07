<template>
  <q-card style="min-width: 30vw">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">New Contract</div>
      <q-space/>
      <q-btn icon="close" flat round dense v-close-popup/>
    </q-card-section>
    <q-card-section>
      <q-form @submit="onSubmit">
        <q-input v-model="contractStore.newContract.task"
                 label="Describe the task *"
                 lazy-rules
                 :rules="[ val => val && val.length > 0 || 'Please type something']"
        />
        <q-input v-model="contractStore.newContract.pay"
                 label="Funding in ether *"
                 type="number"
                 lazy-rules
                 :rules="[ val => val && val.length > 0 || 'Please type something']"
        />
        <q-input filled label="Contract expiration date" v-model="contractStore.newContract.expirationDate" mask="date"
                 :rules="['date']">
          <template v-slot:append>
            <q-icon name="event" class="cursor-pointer">
              <q-popup-proxy
                ref="qDateProxy"
                transition-show="scale"
                transition-hide="scale"
              >
                <q-date v-model="contractStore.newContract.expirationDate">
                  <div class="row items-center justify-end">
                    <q-btn v-close-popup label="Close" color="primary" flat/>
                  </div>
                </q-date>
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>
        <q-select v-model="contractStore.newContract.format"
                  label="Format *"
                  :options="formatOptions"
        />
        <q-input v-model="contractStore.newContract.minimalLength"
                 label="Minimal length of video (minutes)"
                 type="number"
        />
        <q-select v-model="contractStore.newContract.minimalResolution"
                  label="Minimal resolution *"
                  :options="resolutionOptions"
        />
        <q-input filled v-model="contractStore.newContract.passphrase" label="Passphrase *" />
        <div>Enter a pass phrase. Your files will be encrypted using RSA with this pass phrase. Please retain this pass phrase, if you lose it, we will not be able to help you retrieve it and any money you have in the contract may be lost.</div>
        <div class="text-subtitle2" v-if="contractStore.newContract.location.length > 0">Location set</div>
      </q-form>
    </q-card-section>
    <q-card-actions>
      <q-btn color="secondary" @click="startDrawing" flat>
        {{ contractStore.newContract.location.length ? "Redraw Area" : "Draw area" }}
      </q-btn>
      <q-btn color="primary" v-if="contractStore.newContract.location.length > 0" @click="onSubmit" flat>Add Contract</q-btn>
    </q-card-actions>
  </q-card>

</template>

<script>
import {
  defineComponent,
  inject,
  ref
} from "vue";
import {api} from "boot/axios";
import {useWeb3Store} from "stores/web3-store";
import {useContractStore} from "stores/contract-store";
import { VueCryptico } from "vue-cryptico";
import {useQuasar} from "quasar";
import hexer from '../../helpers/hexer';

export default defineComponent({
  name: "NewContractForm",
  setup(props, context) {
    const $q = useQuasar();
    const contractStore = useContractStore();
    const web3Store = useWeb3Store();
    const formatOptions = [
      "Photo", "Video"
    ];

    const resolutionOptions = [
      "480p", "720p", "1080p", "1440p", "4k", "8k"
    ];

    const onSubmit = async () => {
      console.log(web3Store.connected)
      if(!web3Store.connected){
        $q.notify({
          color: "red-5",
          textColor: "white",
          icon: "warning",
          message: "Not connected to Metamask",
        });
        return;
      }
      const dismiss = $q.notify({
        spinner: true,
        message: 'Submitting contract, please wait...',
        timeout: 0
      });
      if (!(contractStore.newContract.location.length > 0)) {
        $q.notify({
          color: "red-5",
          textColor: "white",
          icon: "warning",
          message: "You need to set the contract location first",
        });
      } else {
        try {
          console.log('getting signature')
          const signatureHash = await window.ethereum.request({
            "method": "personal_sign",
            "params": [
              hexer('Signature verification for video file encryption'),
              web3Store.account
            ]
          });
          await api.post('/signatures', {
            signature: signatureHash,
            address: web3Store.account
          }).catch(function (e){
            dismiss();
            $q.notify({
              color: "red-4",
              textColor: "white",
              icon: "error_outline",
              message: "Contract creation failed"
            });

            throw e;
          })
          console.log('creating contract')

          try{
            const createdContract = await web3Store.createContract(contractStore.newContract);
          }
          catch(e){
            dismiss();
            $q.notify({
              color: "red-4",
              textColor: "white",
              icon: "error_outline",
              message: "Contract creation failed"
            });
            console.log('contract creation failed', e)
          }

          await api.post('/ingest');
          await contractStore.updateQuery({...contractStore.contractQuery});
          await contractStore.setNewContract({
            id: contractStore.contracts.length + 1,
            task: "",
            format: "",
            minimalLength: "",
            minimalResolution: "",
            pay: "",
            expirationDate: "",
            location: [],
            active: true,
            passphrase: ""
          });
          dismiss();
          $q.notify({
            color: "green-4",
            textColor: "white",
            icon: "cloud_done",
            message: "Contract submitted"
          });
          contractStore.addContractDialogToggle(false);
        } catch (e) {
          dismiss();
          console.log(e)
          contractStore.addContractDialogToggle(false);
          $q.notify({
            color: "red-4",
            textColor: "white",
            icon: "error_outline",
            message: "Contract creation failed"
          });
        }
      }
    };

    const startDrawing = () => {
      console.log('starting drawing')
      contractStore.addContractDialogToggle(false);
      contractStore.setDrawEnable(true);
      console.log(contractStore.addContractDialog)
    }

    return {
      onSubmit,
      formatOptions,
      resolutionOptions,
      contractStore,
      startDrawing
    }
  }
})
</script>

<style scoped>

</style>
