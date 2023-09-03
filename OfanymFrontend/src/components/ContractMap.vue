<template>
  <ol-map :loadTilesWhileAnimating="true"
          :loadTilesWhileInteracting="true"
          style="height:90vh; width: 80vw;"
          @moveend="moveEnd"
          ref="map">

    <ol-view ref="view" :center="center" :rotation="rotation" :zoom="zoom" :projection="projection"/>

    <ol-tile-layer>
      <ol-source-osm/>
    </ol-tile-layer>
    <ol-interaction-select @select="featureSelected" :condition="selectCondition" ref="selectInteraction">
      <ol-style>
        <ol-style-stroke color="red" :width="10"></ol-style-stroke>
        <ol-style-fill color="rgba(255,255,255,0.5)"></ol-style-fill>
      </ol-style>
    </ol-interaction-select>

    <ol-geolocation :projection="projection" @positionChanged="geoLocChange">
      <template v-slot="slotProps">
        <ol-vector-layer :zIndex="0">

          <ol-source-vector>
            <ol-interaction-draw v-if="contractStore.drawEnable" :type="drawType" @drawend="drawEnd" @drawstart="drawStart">

            </ol-interaction-draw>
            <ol-feature ref="positionFeature">
              <ol-geom-point :coordinates="slotProps.position"></ol-geom-point>
              <ol-style>
                <ol-style-icon :src="hereIcon" :scale="0.1"></ol-style-icon>
              </ol-style>
            </ol-feature>
            <ol-feature v-for="(contract, index) in contractStore.contracts" :key="featureKey(index)" :properties="contract"
                        ref="contracts">
              <ol-geom-polygon :coordinates="contract.coordinates" :key="contract.address"></ol-geom-polygon>
              <ol-style>
                <ol-style-stroke color="green" :width="5"></ol-style-stroke>
              </ol-style>
            </ol-feature>
          </ol-source-vector>

        </ol-vector-layer>
      </template>
    </ol-geolocation>
  </ol-map>

</template>

<script>

import {
  ref,
  defineComponent,
  inject,
  onMounted
} from "vue";
import {useContractStore} from "stores/contract-store";
import hereIcon from "assets/here.png";
import { useRoute } from 'vue-router'

import Web3 from "web3";
import compiledFactory from "app/ethereum/build/MediaContractFactory.json";
export default defineComponent({
  name: "ContractMap",
  components: {},
  setup(props, context) {
    const contractStore = useContractStore();
    const formatOptions = [
      "Photo", "Video"
    ];
    const resolutionOptions = [
      "480p", "720p", "1080p", "1440p", "4k", "8k"
    ];
    const center = ref([40, 40]);
    const projection = ref("EPSG:4326");
    const zoom = ref(10);
    const rotation = ref(0);
    const format = inject("ol-format");
    const geoJson = new format.GeoJSON();
    const view = ref(null);
    const map = ref(null);
    const startDrawing = () => {
      contractStore.setDrawEnable(true);
      context.emit('startDrawing');
    }
    const moveEnd = async (event) => {
      const corners = event.map.frameState_.extent;
      await contractStore.updateQuery({...contractStore.contractQuery, corners})
    }
    const geoLocChange = (loc) => {
      view.value.fit([loc[0], loc[1], loc[0], loc[1]], {
        maxZoom: 10
      });
    };
    const selectConditions = inject("ol-selectconditions");
    const selectCondition = selectConditions.click;
    const clickedFeature = (event) => {
      if (event.selected.length === 1 && event.selected[0].values_.id) {
        contractStore.selectContract(event.selected[0].values_.id);
        context.emit('openContractDialog');
      }
    };
    const featureSelected = (event) => {
      clickedFeature(event);
    };
    const drawType = ref("Polygon");
    const drawStart = (event) => {
      console.log(event);
    };
    const drawEnd = (event) => {
      contractStore.newContract.location = event.feature.values_.geometry.flatCoordinates.reduce((resultArray, item, index) => {
        const chunkIndex = Math.floor(index / 2);
        if (!resultArray[chunkIndex]) {
          resultArray[chunkIndex] = []; // start a new chunk
        }
        resultArray[chunkIndex].push(item);
        console.log('result array', resultArray)
        return resultArray;
      }, []);
      contractStore.newContract.location = contractStore.newContract.location.map((item) => {
        return [item[1], item[0]];
      });
      console.log(contractStore.newContract.location)
      contractStore.setDrawEnable(false);
      context.emit('openNewContractDialog');
    };
    const featureKey = (index) => {
      return index + new Date().getTime();
    }

    const contracts = ref(null);

    const selectInteraction = ref(null);

    onMounted(async() => {
      contractStore.$subscribe((mutation, state) => {
        if (state.selectedContract && state.selectedContract.id && ref(contracts)._value) {
          const feature = ref(contracts)._value.find(value =>
            value.feature.values_.address === state.selectedContract.address
          ).feature;
          selectInteraction.value.select.getFeatures().clear();
          selectInteraction.value.select.getFeatures().push(feature);
        }
      });
      const route = useRoute();
      const contractId = parseInt(route.query.contractId);
      const x =  route.query.x;
      const y =  route.query.y;
      if(parseFloat(x) && parseFloat(y))
        center.value = [parseFloat(x), parseFloat(y)];
      console.log(center.value)
      contractStore.selectContract(contractId);
    });

    return {
      formatOptions,
      resolutionOptions,
      contractStore,
      startDrawing,
      moveEnd,
      ref,
      center,
      projection,
      zoom,
      hereIcon,
      rotation,
      view,
      map,
      geoLocChange,
      featureSelected,
      selectConditions,
      selectCondition,
      geoJson,
      drawType,
      drawEnd,
      drawStart,
      featureKey,
      selectInteraction
    }
  }
})
</script>

<style scoped>

</style>
