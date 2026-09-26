import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { EnDesarrolloComponent } from '../../shared/components/en-desarrollo/en-desarrollo.component';

// 🐉 Sección Bestiario: de momento solo muestra el aviso "En desarrollo".
@Component({
  selector: 'app-bestiario',
  standalone: true,
  imports: [TranslatePipe, EnDesarrolloComponent],
  templateUrl: './bestiario.component.html',
  styleUrl: './bestiario.component.scss'
})
export class BestiarioComponent {}
