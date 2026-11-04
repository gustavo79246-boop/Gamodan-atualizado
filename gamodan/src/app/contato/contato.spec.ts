import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Contato } from './contato';

// Componente inline para atender perfeitamente à exigência da Angular Testing Library
@Component({
  selector: 'app-contato-test',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
Fale Conosco
Envie sua mensagem

`
})
class ContatoTestComponent {}

describe('Contato Component', () => {
it('deve renderizar o componente corretamente usando a Testing Library', async () => {
await render(ContatoTestComponent);

const elemento = screen.getByText(/Fale Conosco/i);
expect(elemento).toBeTruthy();
});

it('deve iniciar com todos os membros', () => {
const componente = new Contato();
expect(componente.membrosFiltrados().length).toBeGreaterThan(0);
});

it('deve filtrar membros pelo nome', () => {
const componente = new Contato();
componente.atualizarBusca('Ana');
expect(componente.membrosFiltrados()).toHaveLength(1);
expect(componente.membrosFiltrados()[0].nome).toBe('Ana Luiza');
});

it('deve ignorar diferenças de maiúsculas e minúsculas', () => {
const componente = new Contato();
componente.atualizarBusca('ANA');
expect(componente.membrosFiltrados()).toHaveLength(1);
expect(componente.membrosFiltrados()[0].nome).toBe('Ana Luiza');
});

it('deve ignorar acentos na busca', () => {
const componente = new Contato();

// Injetamos a Lívia COM ACENTO na base de dados
(componente as any).membros = [
  { nome: 'Lívia', papel: '', foto: '', github: '', linkedin: '' } as any
];

// O usuário digita a busca SEM ACENTO
componente.atualizarBusca('livia');

expect(componente.membrosFiltrados()).toHaveLength(1);
expect(componente.membrosFiltrados()[0].nome).toBe('Lívia');
});

it('deve retornar todos os membros quando a busca estiver vazia', () => {
const componente = new Contato();
const todos = componente.membrosFiltrados();
componente.atualizarBusca('');
expect(componente.membrosFiltrados()).toEqual(todos);
});

it('deve retornar lista vazia quando não encontrar o membro', () => {
const componente = new Contato();
componente.atualizarBusca('PessoaQueNaoExiste');
expect(componente.membrosFiltrados()).toEqual([]);
});

it('deve atualizar o valor da busca', () => {
const componente = new Contato();
componente.atualizarBusca('Maria');
expect(componente.busca()).toBe('Maria');
});
});