<template>
  <q-table
    title="Contracts"
    :rows="contractStore.contracts"
    :columns="columns"
    v-model:pagination="pagination"
    row-key="id"
  >
    <template v-slot:body-cell-actions="props">
      <q-td :props="props">
        <q-btn icon="mode_edit" v-if="props.row.data[6]==='disputed'" v-on:click="acceptDispute(props.row)">Accept Dispute</q-btn>
        <q-btn icon="mode_edit" v-if="props.row.data[6]==='disputed'" v-on:click="rejectDispute(props.row)">Reject Dispute</q-btn>
        <q-btn icon="delete" v-on:click="closeContract(props)">Close</q-btn>
      </q-td>
    </template>
  </q-table>

</template>

<script>
import {
  defineComponent, onMounted,
  ref
} from "vue";
import {useWeb3Store} from "stores/web3-store";
import {useContractStore} from "stores/contract-store";
import {useQuasar, date} from "quasar";


export default defineComponent({
  name: "ContractTable",
  components: {},
  setup(props, context) {

    const $q = useQuasar();
    const contractStore = useContractStore();
    const web3Store = useWeb3Store();
    const pagination = ref({
      sortBy: 'desc',
      descending: false,
      page: contractStore.currentPage,
      rowsPerPage: 20,
      rowsNumber: 10
    })
    const columns = [
      {
        name: 'Address',
        label: 'Address',
        field: row => row.address,
        align: 'left',
        sortable: true
      },
      {
        name: 'Customer',
        label: 'Customer',
        field: row => row.data[0],
        align: 'left',
        sortable: true
      },
      {
        name: 'Reporter',
        label: 'Reporter',
        field: row => row.data[1],
        align: 'left',
        sortable: true
      },
      {
        name: 'Task',
        label: 'Task',
        field: row => row.data[3],
        align: 'left',
        sortable: true
      },
      {
        name: 'Pay',
        label: 'Pay',
        field: row => `${web3Store.fromWei(row.data[2])} eth`,
        align: 'left',
        sortable: true
      },
      {
        name: 'Format',
        label: 'Format',
        field: row => row.data[4],
        align: 'left',
        sortable: true
      },
      {
        name: 'Expires',
        label: 'Expires',
        field: row => new Date(parseInt(row.data[5]) * 1000)
          .toLocaleDateString(undefined,
            {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'}),
        align: 'left',
        sortable: true
      },
      {
        name: 'Status',
        label: 'Status',
        field: row => row.data[6],
        align: 'left',
        sortable: true
      },
      {
        name: 'actions',
        label: 'Actions',
        field: 'actions',
        align: 'left'
      }
    ]

    const acceptDispute= async (row) => {
      try {
        await contractStore.acceptDispute(row.address);
        $q.notify({
          color: 'green-4',
          textColor: 'white',
          icon: 'cloud_done',
          message: 'Dispute accepted',
          position: 'top'
        });
      } catch (e) {
        $q.notify({
          color: 'red-4',
          textColor: 'white',
          icon: 'cloud_done',
          message: 'Error accepting dispute',
          position: 'top'
        });
      }
    }

    const rejectDispute = async (row) => {
      try {
        await contractStore.rejectDispute(row.address);
        $q.notify({
          color: 'green-4',
          textColor: 'white',
          icon: 'cloud_done',
          message: 'Dispute rejected',
          position: 'top'
        });
      } catch (e) {
        $q.notify({
          color: 'red-4',
          textColor: 'white',
          icon: 'cloud_done',
          message: 'Error rejecting dispute',
          position: 'top'
        });
      }
    }

    const closeContract = async (row) => {
      try {
        await contractStore.closeContract(row.address);
        $q.notify({
          color: 'green-4',
          textColor: 'white',
          icon: 'cloud_done',
          message: 'Contract closed',
          position: 'top'
        });
      } catch (e) {
        $q.notify({
          color: 'red-4',
          textColor: 'white',
          icon: 'cloud_done',
          message: 'Error closing contract',
          position: 'top'
        });
      }
    }

    onMounted(async() => {
      await web3Store.setup();
      await contractStore.updateQuery({...contractStore.contractQuery});
    });

    return {
      contractStore,
      web3Store,
      columns,
      pagination,
      acceptDispute,
      rejectDispute,
      closeContract
    }
  }
})
</script>

<style scoped>

</style>
