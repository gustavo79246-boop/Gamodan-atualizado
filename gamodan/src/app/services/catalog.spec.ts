import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';

import { CatalogService } from './catalog';

describe('CatalogService', () => {
  let service: CatalogService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [CatalogService],
    });

    service = TestBed.inject(CatalogService);
  });

  it('deve iniciar com lista vazia', () => {
    expect(service.items()).toEqual([]);
  });

  it('deve adicionar item ao catálogo', () => {
    service.addItem({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    });

    expect(service.items()).toHaveLength(1);
    expect(service.items()[0].nome).toBe('Minecraft');
  });

  it('não deve adicionar item duplicado', () => {
    const item = {
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    };

    service.addItem(item);
    service.addItem({
      nome: 'minecraft',
      imagem: 'outra.jpg',
    });

    expect(service.items()).toHaveLength(1);
  });

  it('deve atualizar item', () => {
    service.addItem({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    });

    service.updateItem('Minecraft', {
      nome: 'Minecraft',
      imagem: 'nova-imagem.jpg',
    });

    expect(service.items()[0].imagem).toBe('nova-imagem.jpg');
  });

  it('deve remover item', () => {
    service.addItem({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    });

    service.removeItem('Minecraft');

    expect(service.items()).toEqual([]);
  });

  it('deve buscar itens pelo nome', () => {
    service.addItem({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    });

    service.addItem({
      nome: 'GTA V',
      imagem: 'gta.jpg',
    });

    const resultado = service.buscar('mine');

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('Minecraft');
  });

  it('deve retornar no máximo 5 resultados', () => {
    for (let i = 1; i <= 7; i++) {
      service.addItem({
        nome: `Jogo ${i}`,
        imagem: `jogo${i}.jpg`,
      });
    }

    const resultado = service.buscar('jogo');

    expect(resultado).toHaveLength(5);
  });

  it('deve retornar lista vazia para busca vazia', () => {
    service.addItem({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    });

    expect(service.buscar('')).toEqual([]);
    expect(service.buscar('   ')).toEqual([]);
  });

  it('deve salvar o catálogo no localStorage', () => {
    service.addItem({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    });

    const salvo = JSON.parse(
      localStorage.getItem('gamodan-catalog')!
    );

    expect(salvo).toEqual([
      {
        nome: 'Minecraft',
        imagem: 'minecraft.jpg',
      },
    ]);
  });
  describe('CatalogService - Cobertura da Linha 54 e Branches do load()', () => {

  it('deve executar o bloco catch e retornar [] quando o JSON estiver corrompido (Linha 54)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('{ json_invalido: ');

    const service = TestBed.inject(CatalogService);
    // Chamamos o método privado load() para validar o retorno do catch
    const items = (service as any).load();

    expect(items).toEqual([]);
  });

  it('deve retornar [] quando os dados do localStorage não forem um Array', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify({ nome: 'Jogo Isolado' }));

    const service = TestBed.inject(CatalogService);
    const items = (service as any).load();

    expect(items).toEqual([]);
  });

  it('deve filtrar itens que possuem nome ou imagem em formatos inválidos', () => {
    const mockData = [
      { nome: 'Jogo Valido', imagem: 'capa.jpg' },
      { nome: 123, imagem: 'capa.jpg' },             // nome inválido
      { nome: 'Sem Imagem', imagem: null },            // imagem inválida
      { nome: null, imagem: null }                     // ambos inválidos
    ];

    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(mockData));

    const service = TestBed.inject(CatalogService);
    const items = (service as any).load();

    expect(items.length).toBe(1);
    expect(items[0].nome).toBe('Jogo Valido');
  });

  it('deve retornar [] quando o localStorage não estiver disponível', () => {
    const service = TestBed.inject(CatalogService);
    // Simula a indisponibilidade do objeto localStorage no ambiente
    vi.spyOn(globalThis, 'localStorage', 'get').mockReturnValue(undefined as any);

    const items = (service as any).load();

    expect(items).toEqual([]);
  });
});
});