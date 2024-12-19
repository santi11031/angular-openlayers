// src/app/app.component.ts

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './map/map.component'; // Importa el componente del mapa

@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [MapComponent] // Importa el MapComponent
})
export class AppComponent {}
