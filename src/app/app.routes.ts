import { Routes } from '@angular/router';
import { Dash } from './ui/container/dash/dash';
import { EmpyPage } from './ui/components/empy-page/empy-page';

export const routes: Routes = [
  { path: 'dash', component: Dash },
  { path: '', redirectTo: 'dash', pathMatch: 'full' },
  { path: '**', component: EmpyPage },
];
