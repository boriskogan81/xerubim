<template>
  <q-page class="flex flex-center">
    <q-dialog v-model="contractDialog" @hide="contractStore.selectContract(0)">
      <SelectedContractDialog @closeContractDialog="closeContractDialog" />
    </q-dialog>
    <q-dialog v-model="contractStore.addContractDialog" >
     <NewContractForm @closeNewContractDialog="closeAddContractDialog" @startDrawing="startDrawing" />
    </q-dialog>
    <ContractMap @openNewContractDialog="openNewContractDialog" @openContractDialog="openContractDialog" />
    <q-page-sticky position="bottom-right" :offset="[36, 36]">
      <q-btn fab icon="add" color="blue" direction="up" @click="fabClick"/>
    </q-page-sticky>
  </q-page>
</template>

<script>
import {
  ref,
  defineComponent,
  onMounted
} from "vue";
import {useContractStore} from "stores/contract-store";
import {useWeb3Store} from "stores/web3-store";
import NewContractForm from "components/NewContractForm.vue";
import ContractMap from "components/ContractMap.vue";
import SelectedContractDialog from "components/SelectedContractDialog.vue";

export default defineComponent({
  name: "IndexPage",
  components: {SelectedContractDialog, NewContractForm, ContractMap},
  setup() {
    const contractStore = useContractStore();
    const web3Store = useWeb3Store();
    const newContract = ref({
      id: contractStore.contracts.length + 1,
      task: "",
      format: "",
      minimalLength: "",
      minimalResolution: "",
      pay: "",
      expirationDate: "",
      location: [],
      active: true,
      signature: ""
    });

    const startDrawing = () => {
      if (contractStore.newContract.location.length)
        contractStore.newContract.location = [];
    };

    const contractDialog = ref(false);
    const addContractDialog = contractStore.addContractDialog;

    const closeAddContractDialog = () => {
      contractStore.addContractDialogToggle(false);
    }

    const openNewContractDialog = () => {
      contractStore.addContractDialogToggle(true);
    }

    const openContractDialog = () => {
      contractDialog.value = true;
    }

    const closeContractDialog = () => {
      contractDialog.value = false;
    }

    const fabClick = () => {
      contractStore.addContractDialogToggle(true);
    };

    const contracts = ref(null);

    onMounted(async() => {
      contractStore.$subscribe((mutation, state) => {
        if (state.selectedContract && state.selectedContract.id && ref(contracts)._value) {
          contractDialog.value = true;
        }
      });
      console.log('setting up web3 store')
      await web3Store.setup();
    });

    return {
      ref,
      fabClick,
      contractDialog,
      addContractDialog,
      newContract,
      contractStore,
      contracts,
      closeAddContractDialog,
      openContractDialog,
      openNewContractDialog,
      startDrawing,
      web3Store,
      closeContractDialog
    };
  }

});
</script>
<style lang="sass" scoped>
.active
  border-color: green
  border-width: thick
</style>
