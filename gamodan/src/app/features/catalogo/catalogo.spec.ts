import { TestBed } from '@angular/core/testing';
import { Catalogo } from './catalogo';
import { CatalogService } from '../../services/catalog';

describe('Catalogo', () => {
  let component: Catalogo;
  let catalog: CatalogService;

  beforeEach(() => {
    // Limpa os dados antes de criar o serviço.
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        CatalogService,
      ],
    });

    catalog = TestBed.inject(CatalogService);

    // Cria o componente sem renderizar o HTML.
    TestBed.runInInjectionContext(() => {
      component = new Catalogo();
    });
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve iniciar sem item selecionado', () => {
    expect(component.selecionado()).toBeNull();
  });

  it('deve iniciar com edição desativada', () => {
    expect(component.editando()).toBe(false);
  });

  it('deve iniciar com adição desativada', () => {
    expect(component.adicionando()).toBe(false);
  });

  it('deve abrir detalhes de um item', () => {
    const item = {
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    };

    component.abrirDetalhes(item);

    expect(component.selecionado()).toEqual(item);
    expect(component.editando()).toBe(false);
  });

  it('deve iniciar edição de um item', () => {
    const item = {
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    };

    component.iniciarEdicao(item);

    expect(component.selecionado()).toEqual(item);
    expect(component.editando()).toBe(true);

    expect(component.form.getRawValue()).toEqual({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    });
  });

  it('deve iniciar edição e parar propagação do evento', () => {
    const item = {
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    };

    const event = {
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent;

    component.iniciarEdicao(item, event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(component.editando()).toBe(true);
  });

  it('deve abrir o formulário de adição', () => {
    component.form.setValue({
      nome: 'Teste',
      imagem: 'teste.jpg',
    });

    component.abrirAdicao();

    expect(component.adicionando()).toBe(true);
    expect(component.selecionado()).toBeNull();

    expect(component.form.getRawValue()).toEqual({
      nome: '',
      imagem: '',
    });
  });

  it('deve abrir adição e parar propagação do evento', () => {
    const event = {
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent;

    component.abrirAdicao(event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(component.adicionando()).toBe(true);
  });

  it('deve fechar o modal', () => {
    const item = {
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    };

    component.abrirDetalhes(item);
    component.iniciarEdicao(item);
    component.abrirAdicao();

    component.fecharModal();

    expect(component.selecionado()).toBeNull();
    expect(component.editando()).toBe(false);
    expect(component.adicionando()).toBe(false);
  });

  it('não deve salvar formulário inválido', () => {
    const spy = vi.spyOn(catalog, 'addItem');

    component.abrirAdicao();

    component.form.setValue({
      nome: '',
      imagem: '',
    });

    component.salvar();

    expect(spy).not.toHaveBeenCalled();

    expect(component.form.controls.nome.touched).toBe(true);
    expect(component.form.controls.imagem.touched).toBe(true);
  });

  it('deve adicionar um novo item', () => {
    const spy = vi.spyOn(catalog, 'addItem');

    component.abrirAdicao();

    component.form.setValue({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    });

    component.salvar();

    expect(spy).toHaveBeenCalledWith({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    });

    expect(component.adicionando()).toBe(false);
    expect(component.selecionado()).toBeNull();
  });

  it('deve editar um item selecionado', () => {
    catalog.addItem({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    });

    const item = catalog.items()[0];

    component.iniciarEdicao(item);

    component.form.setValue({
      nome: 'Minecraft Atualizado',
      imagem: 'minecraft2.jpg',
    });

    const spy = vi.spyOn(catalog, 'updateItem');

    component.salvar();

    expect(spy).toHaveBeenCalledWith(
      'Minecraft',
      {
        nome: 'Minecraft Atualizado',
        imagem: 'minecraft2.jpg',
      },
    );

    expect(component.editando()).toBe(false);
    expect(component.selecionado()?.nome).toBe(
      'Minecraft Atualizado',
    );
  });

  it('não deve editar se não houver item selecionado', () => {
    component.form.setValue({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    });

    const spy = vi.spyOn(catalog, 'updateItem');

    component.salvar();

    expect(spy).not.toHaveBeenCalled();
  });

  it('deve excluir um item', () => {
    catalog.addItem({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    });

    const spy = vi.spyOn(catalog, 'removeItem');

    component.excluir('Minecraft');

    expect(spy).toHaveBeenCalledWith('Minecraft');
  });

  it('deve excluir o item selecionado e fechar o modal', () => {
    catalog.addItem({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    });

    const item = catalog.items()[0];

    component.abrirDetalhes(item);

    component.excluir('Minecraft');

    expect(component.selecionado()).toBeNull();
    expect(component.editando()).toBe(false);
    expect(component.adicionando()).toBe(false);
  });

  it('deve excluir usando evento e parar propagação', () => {
    const event = {
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent;

    component.excluir('Minecraft', event);

    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('não deve fechar o modal ao excluir outro item', () => {
  catalog.addItem({
    nome: 'Minecraft',
    imagem: 'minecraft.jpg',
  });

  catalog.addItem({
    nome: 'Hollow Knight',
    imagem: 'hollow.jpg',
  });

  const itemSelecionado = catalog.items().find(
    (item) => item.nome === 'Minecraft',
  )!;

  component.abrirDetalhes(itemSelecionado);

  component.excluir('Hollow Knight');

  expect(component.selecionado()).toEqual(itemSelecionado);
});

  it('não deve fazer nada quando nenhum arquivo for selecionado', () => {
    const event = {
      target: {
        files: [],
      },
    } as unknown as Event;

    const valorAntes =
      component.form.controls.imagem.value;

    component.selecionarArquivo(event);

    expect(
      component.form.controls.imagem.value,
    ).toBe(valorAntes);
  });

  it('deve carregar a imagem selecionada como Data URL', () => {
  const file = new File(
    ['imagem de teste'],
    'teste.png',
    { type: 'image/png' },
  );

  const event = {
    target: {
      files: [file],
    },
  } as unknown as Event;

  const mockReader = {
    result: 'data:image/png;base64,teste',
    onload: null as ((event: ProgressEvent<FileReader>) => void) | null,
    readAsDataURL: vi.fn(),
  };

  vi.spyOn(window, 'FileReader').mockImplementation(
    function () {
      return mockReader as unknown as FileReader;
    } as unknown as typeof FileReader,
  );

  mockReader.readAsDataURL.mockImplementation(() => {
    if (mockReader.onload) {
      mockReader.onload(
        new ProgressEvent('load') as ProgressEvent<FileReader>,
      );
    }
  });

  component.selecionarArquivo(event);

  expect(
    component.form.controls.imagem.value,
  ).toBe('data:image/png;base64,teste');

  vi.restoreAllMocks();
});
});