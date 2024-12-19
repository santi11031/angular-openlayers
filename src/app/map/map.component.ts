import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { XYZ, Vector as VectorSource } from 'ol/source';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat } from 'ol/proj';
import { Attribution, defaults as defaultControls, ScaleLine, ZoomSlider, ZoomToExtent } from 'ol/control';
import { Style, Fill, Stroke, Circle as CircleStyle, Text } from 'ol/style';
import Overlay from 'ol/Overlay';

@Component({
  selector: 'app-map',
  template: `
    <div #mapContainer class="map-container"></div>
    <!-- Contenedor del popup -->
    <div #popup class="ol-popup">
      <a href="#" id="popup-closer" class="ol-popup-closer" (click)="closePopup($event)">×</a>
      <div id="popup-content"></div>
    </div>
  `,
  styleUrls: ['./map.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class MapComponent implements OnInit {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  @ViewChild('popup', { static: true }) popup!: ElementRef;

  map!: Map;
  overlay!: Overlay;

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
      // Mostrar el valor de 'id' o cualquier atributo
      text: '',
      font: '14px sans-serif',
      fill: new Fill({ color: '#000' }), // Color de texto
      stroke: new Stroke({
        color: '#fff', // Color de contorno del texto
        width: 3,
      }),
      offsetY: -20, // Desplazar el texto hacia arriba
    }),
  });
  ngOnInit(): void {
    // Capa Basemap Satelital de Esri (World Imagery)
    const esriSatelliteLayer = new TileLayer({
      source: new XYZ({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attributions: 'Agencia Catastral de Cundinamarca'
      }),
      visible: true
    });

    const mapView = new View({
      projection: 'EPSG:3857',
      center: fromLonLat([-73.87622, 5.06332]),
      zoom: 15,
    });

    this.map = new Map({
      target: this.mapContainer.nativeElement,
      layers: [esriSatelliteLayer],
      view: mapView,
      controls: defaultControls({
        zoom: false,
        rotate: false,
        attribution: false
      })
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
        const featureId = feature.get('id'); // Obtener el 'id' o cualquier atributo de la feature
        const textStyle = this.vectorStyle.getText(); // Obtener el texto de estilo
    
        if (textStyle) { // Verifica si getText() no es null
          textStyle.setText(featureId); // Establecer el texto de la etiqueta
        }
    
        return this.vectorStyle; // Aplicar el estilo
      },
    });
    
    this.map.addLayer(vectorLayer);

    const scaleLine = new ScaleLine({
      className: 'custom-scale-line'
    });
    this.map.addControl(scaleLine);

    const zoomSlider = new ZoomSlider({
      className: 'custom-zoom-control'
    });
    this.map.addControl(zoomSlider);

    const attribution = new Attribution({
      className: 'custom-atribution-control'
    });
    this.map.addControl(attribution);

    const zoomToExtentControl = new ZoomToExtent({
      className:'custom-zoom-to-extent',
      extent: [-8230000, 479000, -8228000, 481000] 
    });
    this.map.addControl(zoomToExtentControl);

    // Crear el overlay para el popup
    this.overlay = new Overlay({
      element: this.popup.nativeElement,
      autoPan: {
        animation: {
          duration: 250
        }
      }
    });
    this.map.addOverlay(this.overlay);

    // Evento de clic en el mapa
    this.map.on('click', (evt) => {
      this.overlay.setPosition(undefined); // Cerrar popup si no se hace clic en una feature
      this.map.forEachFeatureAtPixel(evt.pixel, (feature) => {
        const props = feature.getProperties();
        delete props['geometry']; // No mostrar la geometría
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
        return true; // Detener si se encontró una feature
      });
    });
  }

  closePopup(event: MouseEvent) {
    event.preventDefault();
    this.overlay.setPosition(undefined);
    return false;
  }
}
