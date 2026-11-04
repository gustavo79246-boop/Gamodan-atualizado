import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { CommunityProfilePage } from './community-profile';
import { CommunityProfilesService } from '../services/community-profiles';

describe('CommunityProfilePage', () => {
  it('deve exibir estatísticas e perfil público sem controles de edição', () => {
    const paramMap = new BehaviorSubject(convertToParamMap({ usuario: 'savepoint' }));
    TestBed.configureTestingModule({
      providers: [
        CommunityProfilesService,
        {
          provide: ActivatedRoute,
          useValue: { paramMap: paramMap.asObservable(), snapshot: { paramMap: paramMap.value } },
        },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new CommunityProfilePage());

    expect(component.profile()?.username).toBe('savepoint');
    expect(component.totalJogos()).toBe(3);
    expect(component.totalJogosIniciados()).toBe(3);
    expect(component.totalFinalizados()).toBe(2);
    expect(component.totalHoras()).toBe(108);
    expect(component.mediaEstrelas()).toBe(4.8);

    paramMap.next(convertToParamMap({ usuario: 'desconhecido' }));
    expect(component.profile()).toBeNull();
  });
});
