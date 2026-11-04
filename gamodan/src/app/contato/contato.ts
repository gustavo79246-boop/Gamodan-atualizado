import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
type Membro = { nome: string; email: string; linkedin: string; github: string };
@Component({ selector: 'app-contato', templateUrl: './contato.html', styleUrl: './contato.css', changeDetection: ChangeDetectionStrategy.OnPush })
export class Contato {
  readonly busca = signal('');
  private readonly membros: Membro[] = [
    { nome: 'Ana Luiza', email: 'analuiza.rochacoelho09@gmail.com', linkedin: 'https://www.linkedin.com/in/ana-luiza-d2312', github: 'https://github.com/analuiza2312' },
    { nome: 'Estela Nunes', email: 'estelanunes889@gmail.com', linkedin: 'https://www.linkedin.com/in/estelabnunes1506/?skipRedirect=true', github: 'https://github.com/estelanunes889' },
    { nome: 'Kethyn', email: 'kethyncris123@gmail.com', linkedin: 'https://linkedin.com/in/kethyn-cris-653033424', github: 'https://github.com/Kethynoliveira1-dev' },
    { nome: 'Marcelli', email: 'martinsmarcelli06@gmail.com', linkedin: 'https://linkedin.com/in/marcelli-ferreira-nestor-martins-a60b26411', github: 'https://github.com/martinsmarcelli06-ctrl' },
    { nome: 'Maria Eduarda', email: 'mariaeduarda19@gmail.com', linkedin: 'https://www.linkedin.com/in/maria-eduarda-gon%C3%A7alo-3aa84837b/', github: 'https://github.com/' },
  ];
  readonly membrosFiltrados = computed(() => { const termo = this.busca().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); return this.membros.filter((membro) => membro.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(termo)); });
  atualizarBusca(valor: string): void { this.busca.set(valor); }
}
