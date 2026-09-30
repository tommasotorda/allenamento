# Metadati per il generatore di schede: schemi, attrezzi (AND di OR), livello, impatto, zone sollecitate, funzionale.
# Uso: python3 scripts/catalogo_meta.py  (aggiorna src/data/exercises.json)
import json
M = {
 # id: (schemi, attrezzi, livello, impatto, sollecita, funzionale)
 'plank': (['anti-estensione'], [['tappetino']], 1, False, [], False),
 'side_plank': (['anti-flessione-laterale'], [['tappetino']], 1, False, ['spalle'], False),
 'dead_bug': (['anti-estensione'], [['tappetino']], 1, False, [], False),
 'bird_dog': (['anti-rotazione', 'anti-estensione'], [['tappetino']], 1, False, [], True),
 'pallof_press': (['anti-rotazione'], [['elastico', 'cavo']], 1, False, [], True),
 'hollow_hold': (['anti-estensione'], [['tappetino']], 2, False, [], False),
 'mcgill_curl_up': (['anti-estensione'], [['tappetino']], 1, False, [], False),
 'trap_bar_deadlift': (['hinge', 'squat'], [['trap-bar']], 2, False, ['schiena'], True),
 'trazioni': (['tirata-verticale'], [['sbarra']], 2, False, ['spalle'], True),
 'hip_thrust': (['hinge'], [['bilanciere'], ['panca']], 2, False, [], False),
 'rematore_manubrio': (['tirata-orizzontale'], [['manubri'], ['panca']], 1, False, [], False),
 'farmer_carry': (['trasporto'], [['manubri', 'kettlebell']], 1, False, [], True),
 'kettlebell_swing': (['hinge', 'balistico'], [['kettlebell']], 2, False, ['schiena'], True),
 'spanish_squat': (['squat', 'ginocchio'], [['elastico']], 1, False, [], False),
 'terminal_knee_extension': (['ginocchio'], [['elastico']], 1, False, [], False),
 'reverse_sled_drag': (['locomozione', 'ginocchio'], [['slitta']], 1, False, [], True),
 'step_up_basso': (['affondo'], [['box']], 1, False, [], True),
 'slider_leg_curl': (['hinge'], [['slider']], 2, False, [], False),
 'polpacci_monopodalici': (['polpacci'], [], 1, False, [], False),
 'tibialis_raise': (['polpacci'], [], 1, False, [], False),
 'box_squat': (['squat'], [['box'], ['bilanciere', 'kettlebell']], 2, False, ['ginocchia'], True),
 'saltelli_sul_posto': (['pliometria'], [], 1, True, ['ginocchia'], False),
 'lancio_palla_medica_petto': (['spinta-orizzontale', 'balistico'], [['palla-medica']], 1, False, [], True),
 'panca_piana': (['spinta-orizzontale'], [['bilanciere', 'manubri'], ['panca']], 2, False, ['spalle'], False),
 'military_press': (['spinta-verticale'], [['bilanciere']], 2, False, ['spalle', 'schiena'], True),
 'landmine_press': (['spinta-verticale'], [['landmine']], 1, False, [], True),
 'stacco_rumeno_manubri': (['hinge'], [['manubri']], 1, False, ['schiena'], True),
 'face_pull': (['tirata-orizzontale', 'scapole'], [['elastico', 'cavo']], 1, False, [], False),
 'push_up': (['spinta-orizzontale', 'anti-estensione'], [], 1, False, ['polsi'], True),
 'copenhagen_plank': (['anti-flessione-laterale'], [['panca']], 3, False, [], False),
 'lancio_rotazionale': (['rotazione', 'balistico'], [['palla-medica']], 2, False, [], True),
 'overhead_back_toss': (['hinge', 'balistico'], [['palla-medica']], 2, False, ['schiena'], True),
 'push_press_manubri': (['spinta-verticale', 'squat'], [['manubri']], 2, False, ['spalle'], True),
 'sled_push': (['locomozione'], [['slitta']], 1, False, [], True),
 'rematore_trx': (['tirata-orizzontale', 'anti-estensione'], [['trx']], 1, False, [], True),
 'turkish_get_up': (['anti-rotazione', 'spinta-verticale', 'affondo'], [['kettlebell']], 3, False, ['spalle'], True),
 'battle_rope': (['cardio'], [['battle-rope']], 1, False, ['spalle'], True),
 'suitcase_carry': (['trasporto', 'anti-flessione-laterale'], [['manubri', 'kettlebell']], 1, False, [], True),
 'sprint_salita': (['cardio'], [], 2, True, ['ginocchia'], False),
 'corsa_zona2': (['cardio'], [], 1, True, ['ginocchia'], False),
 'ripetute_soglia': (['cardio'], [], 2, True, ['ginocchia'], False),
 'intervalli_30_30': (['cardio'], [], 2, True, ['ginocchia'], False),
 'cat_cow': (['mobilita'], [['tappetino']], 1, False, [], False),
 'anche_90_90': (['mobilita'], [['tappetino']], 1, False, [], False),
 'ginocchio_muro': (['mobilita'], [], 1, False, [], False),
 'equilibrio_monopodalico': (['mobilita'], [], 1, False, [], True),
 'rotazioni_esterne_elastico': (['scapole'], [['elastico']], 1, False, [], False),
 'open_book': (['mobilita'], [['tappetino']], 1, False, [], False),
 'respirazione_diaframmatica': (['respirazione'], [['tappetino']], 1, False, [], False),
}
p = 'src/data/exercises.json'
ex = json.load(open(p))
for e in ex:
    if e['id'] in M:
        sc, at, lv, im, so, fu = M[e['id']]
        e.update(schemi=sc, attrezzi=at, livello=lv, impatto=im, sollecita=so, funzionale=fu)
json.dump(ex, open(p, 'w'), ensure_ascii=False, indent=2)
print('meta', len(M))
