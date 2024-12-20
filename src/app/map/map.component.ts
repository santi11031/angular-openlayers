import { Component, OnInit, ElementRef, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { XYZ } from 'ol/source';
import { fromLonLat } from 'ol/proj';
import { Attribution, defaults as defaultControls, ScaleLine, ZoomSlider, ZoomToExtent } from 'ol/control';
import { Style, Fill, Stroke, Circle as CircleStyle, Text } from 'ol/style';
import Overlay from 'ol/Overlay';
import GeoJSON from 'ol/format/GeoJSON';
import LayerSwitcher from 'ol-layerswitcher';
import LayerGroup from 'ol/layer/Group';
import VectorSource from 'ol/source/Vector';

@Component({
  selector: 'app-map',
  template: `
    <div #mapContainer class="map-container"></div>
    <div #popup class="ol-popup">
      <a href="#" id="popup-closer" class="ol-popup-closer" (click)="closePopup($event)">×</a>
      <div id="popup-content"></div>
    </div>




    <!-- Select para cambiar el mapa base -->
    <div class="map-controls">
      <select (change)="onMapChange($event)" class="map-layer-select">
        <option value="Google">Google</option>
        <option value="Esri">Esri Road</option>
        <option value="OSM">OSM</option>
        <option value="MapquestSat">Mapquest Sat</option>
        <option value="MapQuestRoad">MapQuest Road</option>
      </select>
    </div>

  `,
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements OnInit {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  @ViewChild('popup', { static: true }) popup!: ElementRef;
  @ViewChild('legendTooltip', { static: true }) legendTooltip!: ElementRef;

  map!: Map;
  overlay!: Overlay;
  isLegendVisible = false;
  esriSatelliteLayer!: TileLayer;  // Variable para la capa satelital
  layerGroup!: LayerGroup;  // Variable para almacenar el grupo de capas base

  vectorStyle = new Style({
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({ color: 'rgba(0, 0, 2, 0)' }),
      stroke: new Stroke({
        color: '#ffffff',
        width: 2,
      }),
    }),
    stroke: new Stroke({
      color: 'rgba(13, 89, 253, 0.94)',
      width: 2,
    }),
    fill: new Fill({
      color: 'rgba(245, 246, 255, 0.46)',
    }),
    text: new Text({
      text: '',
      font: '14px sans-serif',
      fill: new Fill({ color: '#000' }),
      stroke: new Stroke({
        color: '#fff',
        width: 3,
      }),
      offsetY: -20,
    }),
  });

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Crear la capa base inicial
      this.esriSatelliteLayer = new TileLayer({
        source: new XYZ({
          url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attributions: 'Agencia Catastral de Cundinamarca'
        }),
        visible: true
      });

      const vectorSource = new VectorSource({
        url: 'datos_manta_general_nuevo.geojson',
        format: new GeoJSON({
          dataProjection: 'EPSG:4686',
          featureProjection: 'EPSG:3857'
        }),
      });

      const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: (feature) => {
          const featureId = feature.get('id');
          const textStyle = this.vectorStyle.getText();
          if (textStyle) {
            textStyle.setText(featureId); // Establecer el texto de la etiqueta
          }
          return this.vectorStyle;
        },
      });

      const mapView = new View({
        projection: 'EPSG:3857',
        center: fromLonLat([-73.87622, 5.06332]),
        zoom: 15,
      });

      // Crear un grupo de capas base
      this.layerGroup = new LayerGroup({

        layers: [this.esriSatelliteLayer, vectorLayer]
      });

      this.map = new Map({
        target: this.mapContainer.nativeElement,
        layers: [this.layerGroup],  // Agregar el grupo de capas al mapa
        view: mapView,
        controls: defaultControls({
          zoom: false,
          rotate: false,
          attribution: false
        })
      });

      vectorLayer.set('name', 'Datos de Nemocón');
      this.map.addLayer(vectorLayer);

      this.overlay = new Overlay({
        element: this.popup.nativeElement,
        autoPan: {
          animation: {
            duration: 250
          }
        }
      });
      this.map.addOverlay(this.overlay);

      this.map.on('click', (evt) => {
        this.overlay.setPosition(undefined);
        this.map.forEachFeatureAtPixel(evt.pixel, (feature) => {
          const props = feature.getProperties();
          delete props['geometry'];
          const content = document.getElementById('popup-content');
          if (content) {
            content.innerHTML = '';
            for (const key in props) {
              if (props.hasOwnProperty(key)) {
                content.innerHTML += `<p><b>${key}:</b> ${props[key]}</p>`;
              }
            }
          }
          this.overlay.setPosition(evt.coordinate);
          return true;
        });
      });

      this.createLegend();
    }
  }

  onMapChange(event: any) {
    // Cambiar la capa base según la selección
    const selectedMap = event.target.value;

    let selectedLayer: TileLayer;

    switch (selectedMap) {
      case 'Google':
        selectedLayer = new TileLayer({
          source: new XYZ({
            url: 'http://mt0.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}'
          })
        });
        break;
      case 'Esri':
        selectedLayer = new TileLayer({
          source: new XYZ({
            url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          })
        });
        break;
      case 'OSM':
        selectedLayer = new TileLayer({
          source: new XYZ({
            url: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          })
        });
        break;
      case 'MapquestSat':
        selectedLayer = new TileLayer({
          source: new XYZ({
            url: 'http://mt0.google.com/vt/lyrs=y&hl=en&x=%7Bx%7D&y=%7By%7D&z=%7Bz%7D'
          })
        });
        break;
      case 'MapQuestRoad':
        selectedLayer = new TileLayer({
          source: new XYZ({
            url: 'http://mt0.google.com/vt/lyrs=y&hl=en&x=%7Bx%7D&y=%7By%7D&z=%7Bz%7D'
          })
        });
        break;
      default:
        selectedLayer = this.esriSatelliteLayer;  // Si no hay selección, mantiene la capa por defecto
        break;
    }

    // Reemplazar la capa base del grupo de capas
    const layers = this.layerGroup.getLayers();
    layers.clear();  // Limpiar las capas del grupo
    layers.push(selectedLayer);  // Añadir la nueva capa base seleccionada
  }
  

  closePopup(event: MouseEvent) {
    event.preventDefault();
    this.overlay.setPosition(undefined);
    return false;
  }

  toggleLegend() {
    this.isLegendVisible = !this.isLegendVisible;
    if (this.isLegendVisible) {
      this.overlay.setPosition([0, 0]);
    } else {
      this.overlay.setPosition(undefined);
    }
  }

  closeLegend() {
    this.isLegendVisible = false;
    this.overlay.setPosition(undefined);
  }

  createLegend() {
    const legendList = document.getElementById('legend-list');
    if (!legendList) return;

    legendList.innerHTML = '';

    const layers = this.map.getLayers();
    const legendListContainer = document.createElement('ul');
    layers.forEach((layer) => {
      if (layer.getVisible()) {
        const listItem = document.createElement('li');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = layer.getVisible();
        checkbox.addEventListener('change', () => {
          layer.setVisible(checkbox.checked);
        });
        listItem.appendChild(checkbox);
        listItem.innerHTML += ` ${layer.get('name') || 'Unnamed Layer'}`;
        legendListContainer.appendChild(listItem);
      }
    });

    legendList.appendChild(legendListContainer);
  }
}
