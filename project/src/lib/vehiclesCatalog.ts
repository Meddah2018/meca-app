export interface VehicleModel {
  id: string;
  label: string;
  years: number[];
}

export interface VehicleBrand {
  id: string;
  label: string;
  models: VehicleModel[];
}

function yr(start: number, end: number): number[] {
  const out: number[] = [];
  for (let y = start; y <= end; y++) out.push(y);
  return out;
}

export const VEHICLE_CATALOG: VehicleBrand[] = [
  {
    id: 'renault',
    label: 'Renault',
    models: [
      { id: 'renault_clio_2', label: 'Clio II', years: yr(1998, 2012) },
      { id: 'renault_clio_3', label: 'Clio III', years: yr(2005, 2014) },
      { id: 'renault_clio_4', label: 'Clio IV', years: yr(2012, 2019) },
      { id: 'renault_clio_5', label: 'Clio V', years: yr(2019, 2024) },
      { id: 'renault_symbol', label: 'Symbol', years: yr(2000, 2013) },
      { id: 'renault_symbol_2', label: 'Symbol II', years: yr(2008, 2020) },
      { id: 'renault_symbol_3', label: 'Symbol III', years: yr(2017, 2024) },
      { id: 'renault_megane_2', label: 'Mégane II', years: yr(2002, 2011) },
      { id: 'renault_megane_3', label: 'Mégane III', years: yr(2008, 2016) },
      { id: 'renault_megane_4', label: 'Mégane IV', years: yr(2015, 2024) },
      { id: 'renault_laguna', label: 'Laguna', years: yr(1994, 2015) },
      { id: 'renault_logan', label: 'Logan', years: yr(2004, 2020) },
      { id: 'renault_sandero', label: 'Sandero', years: yr(2007, 2020) },
      { id: 'renault_sandero_2', label: 'Sandero II', years: yr(2012, 2024) },
      { id: 'renault_duster', label: 'Duster', years: yr(2010, 2024) },
      { id: 'renault_duster_2', label: 'Duster II', years: yr(2017, 2024) },
      { id: 'renault_kangoo', label: 'Kangoo', years: yr(1997, 2024) },
      { id: 'renault_twingo', label: 'Twingo', years: yr(1993, 2024) },
      { id: 'renault_fluence', label: 'Fluence', years: yr(2009, 2017) },
      { id: 'renault_captur', label: 'Captur', years: yr(2013, 2024) },
      { id: 'renault_master', label: 'Master', years: yr(1980, 2024) },
      { id: 'renault_trafic', label: 'Trafic', years: yr(1980, 2024) },
      { id: 'renault_express', label: 'Express', years: yr(2021, 2024) },
    ],
  },
  {
    id: 'peugeot',
    label: 'Peugeot',
    models: [
      { id: 'peugeot_206', label: '206', years: yr(1998, 2014) },
      { id: 'peugeot_206_plus', label: '206+', years: yr(2009, 2014) },
      { id: 'peugeot_207', label: '207', years: yr(2006, 2014) },
      { id: 'peugeot_208', label: '208', years: yr(2012, 2024) },
      { id: 'peugeot_301', label: '301', years: yr(2012, 2024) },
      { id: 'peugeot_307', label: '307', years: yr(2001, 2010) },
      { id: 'peugeot_308', label: '308', years: yr(2007, 2024) },
      { id: 'peugeot_406', label: '406', years: yr(1995, 2004) },
      { id: 'peugeot_407', label: '407', years: yr(2004, 2011) },
      { id: 'peugeot_408', label: '408', years: yr(2010, 2024) },
      { id: 'peugeot_508', label: '508', years: yr(2011, 2024) },
      { id: 'peugeot_partner', label: 'Partner', years: yr(1996, 2024) },
      { id: 'peugeot_expert', label: 'Expert', years: yr(1995, 2024) },
      { id: 'peugeot_boxer', label: 'Boxer', years: yr(1994, 2024) },
      { id: 'peugeot_3008', label: '3008', years: yr(2009, 2024) },
      { id: 'peugeot_2008', label: '2008', years: yr(2013, 2024) },
      { id: 'peugeot_5008', label: '5008', years: yr(2009, 2024) },
    ],
  },
  {
    id: 'citroen',
    label: 'Citroën',
    models: [
      { id: 'citroen_c2', label: 'C2', years: yr(2003, 2010) },
      { id: 'citroen_c3', label: 'C3', years: yr(2002, 2024) },
      { id: 'citroen_c4', label: 'C4', years: yr(2004, 2024) },
      { id: 'citroen_c5', label: 'C5', years: yr(2001, 2024) },
      { id: 'citroen_berlingo', label: 'Berlingo', years: yr(1996, 2024) },
      { id: 'citroen_jumper', label: 'Jumper', years: yr(1994, 2024) },
      { id: 'citroen_jumpy', label: 'Jumpy', years: yr(1995, 2024) },
      { id: 'citroen_ds3', label: 'DS3', years: yr(2010, 2019) },
      { id: 'citroen_ds4', label: 'DS4', years: yr(2010, 2018) },
      { id: 'citroen_c_elysee', label: 'C-Elysée', years: yr(2012, 2021) },
      { id: 'citroen_c3_aircross', label: 'C3 Aircross', years: yr(2017, 2024) },
    ],
  },
  {
    id: 'dacia',
    label: 'Dacia',
    models: [
      { id: 'dacia_logan', label: 'Logan', years: yr(2004, 2024) },
      { id: 'dacia_logan_mcv', label: 'Logan MCV', years: yr(2006, 2020) },
      { id: 'dacia_sandero', label: 'Sandero', years: yr(2008, 2024) },
      { id: 'dacia_duster', label: 'Duster', years: yr(2010, 2024) },
      { id: 'dacia_duster_2', label: 'Duster II', years: yr(2017, 2024) },
      { id: 'dacia_dokker', label: 'Dokker', years: yr(2012, 2021) },
      { id: 'dacia_lodgy', label: 'Lodgy', years: yr(2012, 2022) },
      { id: 'dacia_sandero_stepway', label: 'Sandero Stepway', years: yr(2008, 2024) },
      { id: 'dacia_jogger', label: 'Jogger', years: yr(2021, 2024) },
    ],
  },
  {
    id: 'fiat',
    label: 'Fiat',
    models: [
      { id: 'fiat_punto', label: 'Punto', years: yr(1993, 2018) },
      { id: 'fiat_grande_punto', label: 'Grande Punto', years: yr(2005, 2012) },
      { id: 'fiat_500', label: '500', years: yr(2007, 2024) },
      { id: 'fiat_panda', label: 'Panda', years: yr(1980, 2024) },
      { id: 'fiat_bravo', label: 'Bravo', years: yr(2007, 2014) },
      { id: 'fiat_croma', label: 'Croma', years: yr(2005, 2011) },
      { id: 'fiat_doblo', label: 'Doblo', years: yr(2000, 2024) },
      { id: 'fiat_ducato', label: 'Ducato', years: yr(1981, 2024) },
      { id: 'fiat_scudo', label: 'Scudo', years: yr(1995, 2024) },
      { id: 'fiat_tipo', label: 'Tipo', years: yr(2016, 2024) },
      { id: 'fiat_124_spider', label: '124 Spider', years: yr(2016, 2020) },
    ],
  },
  {
    id: 'fiat_professional',
    label: 'Fiat Professional',
    models: [
      { id: 'fiat_pro_ducato', label: 'Ducato', years: yr(1981, 2024) },
      { id: 'fiat_pro_doblo', label: 'Doblo Cargo', years: yr(2000, 2024) },
      { id: 'fiat_pro_scudo', label: 'Scudo', years: yr(1995, 2024) },
      { id: 'fiat_pro_talento', label: 'Talento', years: yr(2016, 2021) },
      { id: 'fiat_pro_fullback', label: 'Fullback', years: yr(2016, 2020) },
    ],
  },
  {
    id: 'volkswagen',
    label: 'Volkswagen',
    models: [
      { id: 'vw_golf_4', label: 'Golf IV', years: yr(1997, 2006) },
      { id: 'vw_golf_5', label: 'Golf V', years: yr(2003, 2009) },
      { id: 'vw_golf_6', label: 'Golf VI', years: yr(2008, 2013) },
      { id: 'vw_golf_7', label: 'Golf VII', years: yr(2012, 2020) },
      { id: 'vw_polo', label: 'Polo', years: yr(1975, 2024) },
      { id: 'vw_passat', label: 'Passat', years: yr(1973, 2024) },
      { id: 'vw_jetta', label: 'Jetta', years: yr(1979, 2024) },
      { id: 'vw_touareg', label: 'Touareg', years: yr(2002, 2024) },
      { id: 'vw_tiguan', label: 'Tiguan', years: yr(2007, 2024) },
      { id: 'vw_caddy', label: 'Caddy', years: yr(1982, 2024) },
      { id: 'vw_transporter', label: 'Transporter', years: yr(1950, 2024) },
      { id: 'vw_crafter', label: 'Crafter', years: yr(2006, 2024) },
      { id: 'vw_beetle', label: 'Beetle', years: yr(1998, 2019) },
      { id: 'vw_amarok', label: 'Amarok', years: yr(2010, 2022) },
      { id: 'vw_tcross', label: 'T-Cross', years: yr(2018, 2024) },
      { id: 'vw_troc', label: 'T-Roc', years: yr(2017, 2024) },
    ],
  },
  {
    id: 'seat',
    label: 'Seat',
    models: [
      { id: 'seat_ibiza', label: 'Ibiza', years: yr(1984, 2024) },
      { id: 'seat_leon', label: 'León', years: yr(1999, 2024) },
      { id: 'seat_cordoba', label: 'Córdoba', years: yr(1993, 2009) },
      { id: 'seat_toledo', label: 'Toledo', years: yr(1991, 2019) },
      { id: 'seat_arona', label: 'Arona', years: yr(2017, 2024) },
      { id: 'seat_ateca', label: 'Ateca', years: yr(2016, 2024) },
      { id: 'seat_alhambra', label: 'Alhambra', years: yr(1996, 2020) },
    ],
  },
  {
    id: 'skoda',
    label: 'Skoda',
    models: [
      { id: 'skoda_fabia', label: 'Fabia', years: yr(1999, 2024) },
      { id: 'skoda_octavia', label: 'Octavia', years: yr(1996, 2024) },
      { id: 'skoda_superb', label: 'Superb', years: yr(2001, 2024) },
      { id: 'skoda_scala', label: 'Scala', years: yr(2019, 2024) },
      { id: 'skoda_kamiq', label: 'Kamiq', years: yr(2019, 2024) },
      { id: 'skoda_karoq', label: 'Karoq', years: yr(2017, 2024) },
      { id: 'skoda_kodiaq', label: 'Kodiaq', years: yr(2016, 2024) },
      { id: 'skoda_roomster', label: 'Roomster', years: yr(2006, 2015) },
    ],
  },
  {
    id: 'audi',
    label: 'Audi',
    models: [
      { id: 'audi_a1', label: 'A1', years: yr(2010, 2024) },
      { id: 'audi_a3', label: 'A3', years: yr(1996, 2024) },
      { id: 'audi_a4', label: 'A4', years: yr(1994, 2024) },
      { id: 'audi_a5', label: 'A5', years: yr(2007, 2024) },
      { id: 'audi_a6', label: 'A6', years: yr(1994, 2024) },
      { id: 'audi_q3', label: 'Q3', years: yr(2011, 2024) },
      { id: 'audi_q5', label: 'Q5', years: yr(2008, 2024) },
      { id: 'audi_q7', label: 'Q7', years: yr(2005, 2024) },
      { id: 'audi_tt', label: 'TT', years: yr(1998, 2023) },
    ],
  },
  {
    id: 'mercedes',
    label: 'Mercedes-Benz',
    models: [
      { id: 'mb_a', label: 'Classe A', years: yr(1997, 2024) },
      { id: 'mb_b', label: 'Classe B', years: yr(2005, 2024) },
      { id: 'mb_c', label: 'Classe C', years: yr(1993, 2024) },
      { id: 'mb_e', label: 'Classe E', years: yr(1993, 2024) },
      { id: 'mb_s', label: 'Classe S', years: yr(1972, 2024) },
      { id: 'mb_gla', label: 'GLA', years: yr(2013, 2024) },
      { id: 'mb_glc', label: 'GLC', years: yr(2015, 2024) },
      { id: 'mb_gle', label: 'GLE', years: yr(1997, 2024) },
      { id: 'mb_glk', label: 'GLK', years: yr(2008, 2015) },
      { id: 'mb_cls', label: 'CLS', years: yr(2004, 2024) },
      { id: 'mb_sprinter', label: 'Sprinter', years: yr(1995, 2024) },
      { id: 'mb_vito', label: 'Vito', years: yr(1995, 2024) },
      { id: 'mb_viano', label: 'Viano', years: yr(2003, 2014) },
      { id: 'mb_180', label: '180', years: yr(2012, 2024) },
    ],
  },
  {
    id: 'bmw',
    label: 'BMW',
    models: [
      { id: 'bmw_serie_1', label: 'Série 1', years: yr(2004, 2024) },
      { id: 'bmw_serie_2', label: 'Série 2', years: yr(2014, 2024) },
      { id: 'bmw_serie_3', label: 'Série 3', years: yr(1975, 2024) },
      { id: 'bmw_serie_5', label: 'Série 5', years: yr(1972, 2024) },
      { id: 'bmw_serie_7', label: 'Série 7', years: yr(1977, 2024) },
      { id: 'bmw_x1', label: 'X1', years: yr(2009, 2024) },
      { id: 'bmw_x3', label: 'X3', years: yr(2003, 2024) },
      { id: 'bmw_x5', label: 'X5', years: yr(1999, 2024) },
      { id: 'bmw_x6', label: 'X6', years: yr(2008, 2024) },
    ],
  },
  {
    id: 'opel',
    label: 'Opel',
    models: [
      { id: 'opel_corsa', label: 'Corsa', years: yr(1982, 2024) },
      { id: 'opel_astra', label: 'Astra', years: yr(1991, 2024) },
      { id: 'opel_vectra', label: 'Vectra', years: yr(1988, 2009) },
      { id: 'opel_insignia', label: 'Insignia', years: yr(2008, 2022) },
      { id: 'opel_mokka', label: 'Mokka', years: yr(2012, 2024) },
      { id: 'opel_croslant', label: 'Crossland', years: yr(2017, 2024) },
      { id: 'opel_grandland', label: 'Grandland', years: yr(2017, 2024) },
      { id: 'opel_combo', label: 'Combo', years: yr(1986, 2024) },
      { id: 'opel_vivaro', label: 'Vivaro', years: yr(2001, 2024) },
      { id: 'opel_movano', label: 'Movano', years: yr(1998, 2024) },
    ],
  },
  {
    id: 'ford',
    label: 'Ford',
    models: [
      { id: 'ford_fiesta', label: 'Fiesta', years: yr(1976, 2023) },
      { id: 'ford_focus', label: 'Focus', years: yr(1998, 2024) },
      { id: 'ford_fusion', label: 'Fusion', years: yr(2002, 2012) },
      { id: 'ford_mondeo', label: 'Mondeo', years: yr(1993, 2022) },
      { id: 'ford_ka', label: 'Ka', years: yr(1996, 2019) },
      { id: 'ford_kuga', label: 'Kuga', years: yr(2008, 2024) },
      { id: 'ford_ecosport', label: 'EcoSport', years: yr(2003, 2022) },
      { id: 'ford_ranger', label: 'Ranger', years: yr(1998, 2024) },
      { id: 'ford_transit', label: 'Transit', years: yr(1965, 2024) },
      { id: 'ford_transit_custom', label: 'Transit Custom', years: yr(2012, 2024) },
      { id: 'ford_tourneo', label: 'Tourneo', years: yr(1994, 2024) },
    ],
  },
  {
    id: 'toyota',
    label: 'Toyota',
    models: [
      { id: 'toyota_yaris', label: 'Yaris', years: yr(1999, 2024) },
      { id: 'toyota_corolla', label: 'Corolla', years: yr(1966, 2024) },
      { id: 'toyota_auris', label: 'Auris', years: yr(2007, 2018) },
      { id: 'toyota_camry', label: 'Camry', years: yr(1982, 2024) },
      { id: 'toyota_avensis', label: 'Avensis', years: yr(1997, 2018) },
      { id: 'toyota_rav4', label: 'RAV4', years: yr(1994, 2024) },
      { id: 'toyota_hilux', label: 'Hilux', years: yr(1968, 2024) },
      { id: 'toyota_land_cruiser', label: 'Land Cruiser', years: yr(1951, 2024) },
      { id: 'toyota_fortuner', label: 'Fortuner', years: yr(2004, 2024) },
      { id: 'toyota_prius', label: 'Prius', years: yr(1997, 2024) },
      { id: 'toyota_c_hy', label: 'C-HR', years: yr(2016, 2024) },
      { id: 'toyota_hiace', label: 'Hiace', years: yr(1967, 2024) },
    ],
  },
  {
    id: 'nissan',
    label: 'Nissan',
    models: [
      { id: 'nissan_micra', label: 'Micra', years: yr(1982, 2024) },
      { id: 'nissan_note', label: 'Note', years: yr(2005, 2019) },
      { id: 'nissan_almera', label: 'Almera', years: yr(1995, 2018) },
      { id: 'nissan_sunny', label: 'Sunny', years: yr(1966, 2018) },
      { id: 'nissan_qashqai', label: 'Qashqai', years: yr(2007, 2024) },
      { id: 'nissan_juke', label: 'Juke', years: yr(2010, 2024) },
      { id: 'nissan_x_trail', label: 'X-Trail', years: yr(2001, 2024) },
      { id: 'nissan_patrol', label: 'Patrol', years: yr(1951, 2024) },
      { id: 'nissan_navara', label: 'Navara', years: yr(1997, 2024) },
      { id: 'nissan_leaf', label: 'Leaf', years: yr(2010, 2024) },
    ],
  },
  {
    id: 'hyundai',
    label: 'Hyundai',
    models: [
      { id: 'hyundai_i10', label: 'i10', years: yr(2008, 2024) },
      { id: 'hyundai_i20', label: 'i20', years: yr(2008, 2024) },
      { id: 'hyundai_i30', label: 'i30', years: yr(2007, 2024) },
      { id: 'hyundai_accent', label: 'Accent', years: yr(1994, 2018) },
      { id: 'hyundai_elantra', label: 'Elantra', years: yr(1990, 2024) },
      { id: 'hyundai_sonata', label: 'Sonata', years: yr(1985, 2024) },
      { id: 'hyundai_tucson', label: 'Tucson', years: yr(2004, 2024) },
      { id: 'hyundai_santa_fe', label: 'Santa Fe', years: yr(2000, 2024) },
      { id: 'hyundai_creta', label: 'Creta', years: yr(2014, 2024) },
      { id: 'hyundai_ix35', label: 'ix35', years: yr(2009, 2015) },
      { id: 'hyundai_h1', label: 'H1', years: yr(1997, 2024) },
      { id: 'hyundai_h350', label: 'H350', years: yr(2015, 2021) },
    ],
  },
  {
    id: 'kia',
    label: 'Kia',
    models: [
      { id: 'kia_picanto', label: 'Picanto', years: yr(2004, 2024) },
      { id: 'kia_rio', label: 'Rio', years: yr(2000, 2023) },
      { id: 'kia_ceed', label: 'Ceed', years: yr(2006, 2024) },
      { id: 'kia_cerato', label: 'Cerato', years: yr(2003, 2021) },
      { id: 'kia_optima', label: 'Optima', years: yr(2000, 2020) },
      { id: 'kia_sportage', label: 'Sportage', years: yr(1995, 2024) },
      { id: 'kia_sorento', label: 'Sorento', years: yr(2002, 2024) },
      { id: 'kia_stonic', label: 'Stonic', years: yr(2017, 2024) },
      { id: 'kia_niro', label: 'Niro', years: yr(2016, 2024) },
      { id: 'kia_soul', label: 'Soul', years: yr(2008, 2024) },
      { id: 'kia_pegas', label: 'Pegas', years: yr(2011, 2024) },
    ],
  },
  {
    id: 'suzuki',
    label: 'Suzuki',
    models: [
      { id: 'suzuki_alto', label: 'Alto', years: yr(1979, 2024) },
      { id: 'suzuki_celerio', label: 'Celerio', years: yr(2014, 2024) },
      { id: 'suzuki_swift', label: 'Swift', years: yr(2000, 2024) },
      { id: 'suzuki_ignis', label: 'Ignis', years: yr(2000, 2024) },
      { id: 'suzuki_vitara', label: 'Vitara', years: yr(1988, 2024) },
      { id: 'suzuki_sx4', label: 'SX4', years: yr(2006, 2017) },
      { id: 'suzuki_jimny', label: 'Jimny', years: yr(1970, 2024) },
      { id: 'suzuki_carry', label: 'Carry', years: yr(1961, 2024) },
    ],
  },
  {
    id: 'mitsubishi',
    label: 'Mitsubishi',
    models: [
      { id: 'mitsubishi_space_star', label: 'Space Star', years: yr(1998, 2024) },
      { id: 'mitsubishi_lancer', label: 'Lancer', years: yr(1973, 2017) },
      { id: 'mitsubishi_outlander', label: 'Outlander', years: yr(2001, 2024) },
      { id: 'mitsubishi_asx', label: 'ASX', years: yr(2010, 2024) },
      { id: 'mitsubishi_pajero', label: 'Pajero', years: yr(1982, 2021) },
      { id: 'mitsubishi_l200', label: 'L200', years: yr(1978, 2024) },
      { id: 'mitsubishi_l300', label: 'L300', years: yr(1986, 2024) },
      { id: 'mitsubishi_eclipse_cross', label: 'Eclipse Cross', years: yr(2017, 2024) },
    ],
  },
  {
    id: 'isuzu',
    label: 'Isuzu',
    models: [
      { id: 'isuzu_d_max', label: 'D-Max', years: yr(2002, 2024) },
      { id: 'isuzu_npr', label: 'NPR', years: yr(1985, 2024) },
      { id: 'isuzu_nqr', label: 'NQR', years: yr(1985, 2024) },
      { id: 'isuzu_frr', label: 'FRR', years: yr(1990, 2024) },
      { id: 'isuzu_forward', label: 'Forward', years: yr(1970, 2024) },
    ],
  },
  {
    id: 'mazda',
    label: 'Mazda',
    models: [
      { id: 'mazda_2', label: '2', years: yr(2002, 2024) },
      { id: 'mazda_3', label: '3', years: yr(2003, 2024) },
      { id: 'mazda_6', label: '6', years: yr(2002, 2024) },
      { id: 'mazda_cx_3', label: 'CX-3', years: yr(2015, 2024) },
      { id: 'mazda_cx_5', label: 'CX-5', years: yr(2012, 2024) },
      { id: 'mazda_cx_7', label: 'CX-7', years: yr(2006, 2012) },
      { id: 'mazda_bt_50', label: 'BT-50', years: yr(2006, 2024) },
    ],
  },
  {
    id: 'honda',
    label: 'Honda',
    models: [
      { id: 'honda_civic', label: 'Civic', years: yr(1972, 2024) },
      { id: 'honda_accord', label: 'Accord', years: yr(1976, 2022) },
      { id: 'honda_city', label: 'City', years: yr(1981, 2024) },
      { id: 'honda_jazz', label: 'Jazz', years: yr(2001, 2024) },
      { id: 'honda_cr_v', label: 'CR-V', years: yr(1995, 2024) },
      { id: 'honda_hr_v', label: 'HR-V', years: yr(1998, 2024) },
      { id: 'honda_pilot', label: 'Pilot', years: yr(2002, 2024) },
    ],
  },
  {
    id: 'chevrolet',
    label: 'Chevrolet',
    models: [
      { id: 'chevrolet_spark', label: 'Spark', years: yr(1998, 2022) },
      { id: 'chevrolet_aveo', label: 'Aveo', years: yr(2002, 2020) },
      { id: 'chevrolet_cruze', label: 'Cruze', years: yr(2008, 2019) },
      { id: 'chevrolet_lacetti', label: 'Lacetti', years: yr(2002, 2013) },
      { id: 'chevrolet_captiva', label: 'Captiva', years: yr(2006, 2024) },
      { id: 'chevrolet_trailblazer', label: 'TrailBlazer', years: yr(2001, 2024) },
      { id: 'chevrolet_sonic', label: 'Sonic', years: yr(2011, 2020) },
      { id: 'chevrolet_camaro', label: 'Camaro', years: yr(1967, 2024) },
    ],
  },
  {
    id: 'chery',
    label: 'Chery',
    models: [
      { id: 'chery_tiggo_3', label: 'Tiggo 3', years: yr(2014, 2024) },
      { id: 'chery_tiggo_4', label: 'Tiggo 4', years: yr(2017, 2024) },
      { id: 'chery_tiggo_5', label: 'Tiggo 5', years: yr(2013, 2024) },
      { id: 'chery_tiggo_7', label: 'Tiggo 7', years: yr(2016, 2024) },
      { id: 'chery_tiggo_8', label: 'Tiggo 8', years: yr(2018, 2024) },
      { id: 'chery_arrizo_5', label: 'Arrizo 5', years: yr(2016, 2024) },
      { id: 'chery_arrizo_6', label: 'Arrizo 6', years: yr(2018, 2024) },
      { id: 'chery_qq', label: 'QQ', years: yr(2003, 2015) },
      { id: 'chery_e3', label: 'E3', years: yr(2013, 2020) },
    ],
  },
  {
    id: 'geely',
    label: 'Geely',
    models: [
      { id: 'geely_emgrand_7', label: 'Emgrand 7', years: yr(2012, 2024) },
      { id: 'geely_emgrand_gx7', label: 'Emgrand GX7', years: yr(2012, 2020) },
      { id: 'geely_emgrand_x7', label: 'Emgrand X7', years: yr(2016, 2024) },
      { id: 'geely_coolray', label: 'Coolray', years: yr(2018, 2024) },
      { id: 'geely_atlas', label: 'Atlas', years: yr(2018, 2024) },
      { id: 'geely_tugella', label: 'Tugella', years: yr(2019, 2024) },
      { id: 'geely_gc6', label: 'GC6', years: yr(2014, 2020) },
      { id: 'geely_mk', label: 'MK', years: yr(2006, 2016) },
      { id: 'geely_ck', label: 'CK', years: yr(2005, 2015) },
    ],
  },
  {
    id: 'jac',
    label: 'JAC',
    models: [
      { id: 'jac_s3', label: 'S3 (Refine S3)', years: yr(2014, 2024) },
      { id: 'jac_s4', label: 'S4 (Refine S4)', years: yr(2018, 2024) },
      { id: 'jac_s5', label: 'S5 (Refine S5)', years: yr(2012, 2024) },
      { id: 'jac_s7', label: 'S7 (Refine S7)', years: yr(2017, 2024) },
      { id: 'jac_a5', label: 'A5 (iA5)', years: yr(2019, 2024) },
      { id: 'jac_t6', label: 'T6 (Rein T6)', years: yr(2015, 2024) },
      { id: 'jac_t8', label: 'T8 (Rein T8)', years: yr(2018, 2024) },
      { id: 'jac_x200', label: 'X200', years: yr(2010, 2020) },
      { id: 'jac_n35', label: 'N35', years: yr(2008, 2018) },
      { id: 'jac_sunray', label: 'Sunray', years: yr(2015, 2024) },
    ],
  },
  {
    id: 'great_wall',
    label: 'Great Wall',
    models: [
      { id: 'gw_wingle_5', label: 'Wingle 5', years: yr(2010, 2024) },
      { id: 'gw_wingle_6', label: 'Wingle 6', years: yr(2013, 2024) },
      { id: 'gw_wingle_7', label: 'Wingle 7', years: yr(2018, 2024) },
      { id: 'gw_steed', label: 'Steed', years: yr(2006, 2020) },
      { id: 'gw_haval_h6', label: 'Haval H6', years: yr(2011, 2024) },
      { id: 'gw_haval_h2', label: 'Haval H2', years: yr(2014, 2020) },
      { id: 'gw_haval_h9', label: 'Haval H9', years: yr(2014, 2024) },
      { id: 'gw_haval_jolion', label: 'Haval Jolion', years: yr(2020, 2024) },
      { id: 'gw_c30', label: 'C30', years: yr(2010, 2018) },
      { id: 'gw_c10', label: 'C10 (Flori)', years: yr(2008, 2015) },
    ],
  },
  {
    id: 'dfsk', label: 'DFSK', models: [
      { id: 'dfsk_glory_500', label: 'Glory 500', years: yr(2018, 2024) },
      { id: 'dfsk_glory_580', label: 'Glory 580', years: yr(2016, 2024) },
      { id: 'dfsk_s500', label: 'S500', years: yr(2016, 2024) },
      { id: 'dfsk_s560', label: 'S560', years: yr(2017, 2024) },
      { id: 'dfsk_5008', label: '5008', years: yr(2018, 2024) },
      { id: 'dfsk_superb', label: 'Superb', years: yr(2019, 2024) },
      { id: 'dfsk_k01', label: 'K01', years: yr(2014, 2020) },
      { id: 'dfsk_k07', label: 'K07', years: yr(2011, 2024) },
    ] },
  {
    id: 'jetour', label: 'Jetour', models: [
      { id: 'jetour_x70', label: 'X70', years: yr(2018, 2024) },
      { id: 'jetour_x70_plus', label: 'X70 Plus', years: yr(2020, 2024) },
      { id: 'jetour_x70s', label: 'X70S', years: yr(2018, 2024) },
      { id: 'jetour_x90', label: 'X90', years: yr(2019, 2024) },
      { id: 'jetour_x90_plus', label: 'X90 Plus', years: yr(2021, 2024) },
      { id: 'jetour_dashing', label: 'Dashing', years: yr(2021, 2024) },
      { id: 'jetour_t2', label: 'T2', years: yr(2023, 2024) },
    ] },
  {
    id: 'changan', label: 'Changan', models: [
      { id: 'changan_alvil', label: 'Alsvin', years: yr(2009, 2024) },
      { id: 'changan_eado', label: 'Eado', years: yr(2012, 2024) },
      { id: 'changan_eado_xt', label: 'Eado XT', years: yr(2014, 2024) },
      { id: 'changan_cs35', label: 'CS35', years: yr(2012, 2024) },
      { id: 'changan_cs35_plus', label: 'CS35 Plus', years: yr(2018, 2024) },
      { id: 'changan_cs55', label: 'CS55', years: yr(2017, 2024) },
      { id: 'changan_cs75', label: 'CS75', years: yr(2014, 2024) },
      { id: 'changan_cs95', label: 'CS95', years: yr(2017, 2024) },
      { id: 'changan_uni_t', label: 'UNI-T', years: yr(2020, 2024) },
      { id: 'changan_uni_v', label: 'UNI-V', years: yr(2021, 2024) },
    ] },
  {
    id: 'faw', label: 'FAW', models: [
      { id: 'faw_besturn_b50', label: 'Besturn B50', years: yr(2009, 2018) },
      { id: 'faw_besturn_b70', label: 'Besturn B70', years: yr(2006, 2024) },
      { id: 'faw_besturn_x40', label: 'Besturn X40', years: yr(2016, 2022) },
      { id: 'faw_besturn_x80', label: 'Besturn X80', years: yr(2014, 2020) },
      { id: 'faw_vita', label: 'Vita (V2)', years: yr(2010, 2018) },
      { id: 'faw_olen', label: 'Oley', years: yr(2012, 2018) },
      { id: 'faw_j6', label: 'J6', years: yr(2007, 2024) },
      { id: 'faw_xiali_n7', label: 'Xiali N7', years: yr(2013, 2018) },
    ] },
  {
    id: 'baic', label: 'BAIC', models: [
      { id: 'baic_senova_d50', label: 'Senova D50', years: yr(2014, 2024) },
      { id: 'baic_senova_x25', label: 'Senova X25', years: yr(2015, 2024) },
      { id: 'baic_senova_x35', label: 'Senova X35', years: yr(2016, 2024) },
      { id: 'baic_senova_x65', label: 'Senova X65', years: yr(2015, 2020) },
      { id: 'baic_bj40', label: 'BJ40', years: yr(2014, 2024) },
      { id: 'baic_bj80', label: 'BJ80', years: yr(2016, 2024) },
      { id: 'baic_zhi_da_x3', label: 'Zhi Da X3', years: yr(2017, 2024) },
      { id: 'baic_huansu_s3', label: 'Huansu S3', years: yr(2014, 2020) },
    ] },
  {
    id: 'dongfeng', label: 'Dongfeng', models: [
      { id: 'dongfeng_ax7', label: 'AX7', years: yr(2014, 2024) },
      { id: 'dongfeng_ax4', label: 'AX4', years: yr(2017, 2024) },
      { id: 'dongfeng_ax3', label: 'AX3', years: yr(2015, 2024) },
      { id: 'dongfeng_s30', label: 'S30', years: yr(2009, 2020) },
      { id: 'dongfeng_x5', label: 'X5', years: yr(2016, 2024) },
      { id: 'dongfeng_xk', label: 'XK', years: yr(2018, 2024) },
      { id: 'dongfeng_t5', label: 'T5', years: yr(2018, 2024) },
      { id: 'dongfeng_rich', label: 'Rich', years: yr(2021, 2024) },
    ] },
  {
    id: 'mahindra', label: 'Mahindra', models: [
      { id: 'mahindra_scorpio', label: 'Scorpio', years: yr(2002, 2024) },
      { id: 'mahindra_xuv500', label: 'XUV500', years: yr(2011, 2021) },
      { id: 'mahindra_xuv700', label: 'XUV700', years: yr(2021, 2024) },
      { id: 'mahindra_thar', label: 'Thar', years: yr(2010, 2024) },
      { id: 'mahindra_bolero', label: 'Bolero', years: yr(2000, 2024) },
      { id: 'mahindra_pikup', label: 'Pik-Up', years: yr(2006, 2024) },
      { id: 'mahindra_kuv100', label: 'KUV100', years: yr(2016, 2020) },
      { id: 'mahindra_tuv300', label: 'TUV300', years: yr(2015, 2020) },
    ] },
  {
    id: 'tata', label: 'Tata', models: [
      { id: 'tata_indica', label: 'Indica', years: yr(1998, 2018) },
      { id: 'tata_indigo', label: 'Indigo', years: yr(2002, 2018) },
      { id: 'tata_nano', label: 'Nano', years: yr(2008, 2018) },
      { id: 'tata_tiago', label: 'Tiago', years: yr(2016, 2024) },
      { id: 'tata_tigor', label: 'Tigor', years: yr(2017, 2024) },
      { id: 'tata_nexon', label: 'Nexon', years: yr(2017, 2024) },
      { id: 'tata_harrier', label: 'Harrier', years: yr(2019, 2024) },
      { id: 'tata_safari', label: 'Safari', years: yr(1998, 2024) },
      { id: 'tata_sumo', label: 'Sumo', years: yr(1994, 2019) },
    ] },
  {
    id: 'iveco', label: 'Iveco', models: [
      { id: 'iveco_daily', label: 'Daily', years: yr(1978, 2024) },
      { id: 'iveco_eurocargo', label: 'Eurocargo', years: yr(1991, 2024) },
      { id: 'iveco_stralis', label: 'Stralis', years: yr(2003, 2019) },
      { id: 'iveco_trakker', label: 'Trakker', years: yr(2004, 2024) },
      { id: 'iveco_s_way', label: 'S-Way', years: yr(2019, 2024) },
      { id: 'iveco_t_way', label: 'T-Way', years: yr(2021, 2024) },
      { id: 'iveco_acco', label: 'Acco', years: yr(1970, 2020) },
    ] },
];

export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function searchBrands(query: string, limit = 10): VehicleBrand[] {
  if (!query.trim()) return VEHICLE_CATALOG.slice(0, limit);
  const n = normalize(query);
  return VEHICLE_CATALOG.filter(b => normalize(b.label).startsWith(n)).slice(0, limit);
}

export function searchModels(brandId: string, query: string, limit = 20): VehicleModel[] {
  const brand = VEHICLE_CATALOG.find(b => b.id === brandId);
  if (!brand) return [];
  if (!query.trim()) return brand.models.slice(0, limit);
  const n = normalize(query);
  return brand.models.filter(m => normalize(m.label).includes(n)).slice(0, limit);
}

export function getBrand(brandId: string): VehicleBrand | undefined {
  return VEHICLE_CATALOG.find(b => b.id === brandId);
}

export function getModel(brandId: string, modelId: string): VehicleModel | undefined {
  return getBrand(brandId)?.models.find(m => m.id === modelId);
}
