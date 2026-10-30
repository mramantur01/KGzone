// Japanese frame (body) numbers -> model. Right-hand-drive Japanese-market cars usually have a
// frame number like "NZE141-1234567" instead of a 17-character VIN; its first part is the
// manufacturer's model code. Public model codes of popular cars in Kyrgyzstan.
// Format: [codes, brand, model (as in the site's model list), display name, generation, years, engine]
// Some codes are shared by two models (e.g. Camry and Lexus ES) — then both are offered.

type Row = [string[], string, string, string, string, string, string];

const ROWS: Row[] = [
  // Toyota
  [['NZE121', 'NZE124', 'ZZE121', 'ZZE122', 'ZZE123', 'ZZE124'], 'Toyota', 'Corolla', 'Corolla / Runx / Allex / Fielder (E120)', 'E120', '2000–2006', '1NZ-FE / 1ZZ-FE / 2ZZ-GE'],
  [['NZE141', 'NZE144'], 'Toyota', 'Corolla', 'Corolla Axio / Fielder (E140)', 'E140', '2006–2012', '1NZ-FE 1.5'],
  [['ZRE142', 'ZRE144'], 'Toyota', 'Corolla', 'Corolla Axio / Fielder (E140)', 'E140', '2006–2012', '2ZR-FE 1.8'],
  [['NZE161', 'NZE164', 'NRE161', 'NKE165', 'ZRE162'], 'Toyota', 'Corolla', 'Corolla Axio / Fielder (E160)', 'E160', '2012–2019', '1NZ-FE / 2NR-FKE / 1NZ-FXE гибрид'],
  [['ACV30', 'ACV31', 'ACV35', 'MCV30'], 'Toyota', 'Camry', 'Camry (XV30)', 'XV30', '2001–2006', '2AZ-FE 2.4 / 1MZ-FE 3.0'],
  [['ACV40', 'ACV45', 'AHV40'], 'Toyota', 'Camry', 'Camry (XV40)', 'XV40', '2006–2011', '2AZ-FE 2.4 / 2AZ-FXE гибрид'],
  [['ASV50', 'ASV51', 'AVV50', 'GSV50'], 'Toyota', 'Camry', 'Camry (XV50)', 'XV50', '2011–2017', '2AR-FE 2.5 / 2AR-FXE гибрид / 2GR-FE 3.5'],
  [['ASV70', 'ASV71', 'AXVA70', 'AXVH70', 'AXVH71', 'GSV70'], 'Toyota', 'Camry', 'Camry (XV70)', 'XV70', '2017–2024', '2AR-FE / A25A-FKS 2.5 / гибрид / 2GR-FKS 3.5'],
  [['ACA20', 'ACA21', 'ACA26'], 'Toyota', 'RAV4', 'RAV4 (XA20)', 'XA20', '2000–2005', '1AZ-FE 2.0 / 2AZ-FE 2.4'],
  [['ACA30', 'ACA31', 'ACA33', 'ACA36', 'ACA38'], 'Toyota', 'RAV4', 'RAV4 / Vanguard (XA30)', 'XA30', '2005–2012', '2AZ-FE 2.4'],
  [['ASA42', 'ASA44', 'ZSA42', 'ZSA44', 'AVA44'], 'Toyota', 'RAV4', 'RAV4 (XA40)', 'XA40', '2012–2018', '2AR-FE 2.5 / 3ZR-FAE 2.0 / гибрид'],
  [['MXAA52', 'MXAA54', 'AXAH52', 'AXAH54', 'AXAA54'], 'Toyota', 'RAV4', 'RAV4 (XA50)', 'XA50', '2018–н.в.', 'M20A-FKS 2.0 / A25A 2.5 / гибрид'],
  [['NHW20'], 'Toyota', 'Prius', 'Prius (XW20)', 'XW20', '2003–2009', '1NZ-FXE гибрид'],
  [['ZVW30', 'ZVW35'], 'Toyota', 'Prius', 'Prius (XW30)', 'XW30', '2009–2015', '2ZR-FXE гибрид'],
  [['ZVW50', 'ZVW51', 'ZVW55'], 'Toyota', 'Prius', 'Prius (XW50)', 'XW50', '2015–2022', '2ZR-FXE гибрид'],
  [['ZVW40', 'ZVW41'], 'Toyota', 'Prius', 'Prius Alpha / Prius+ (ZVW40)', 'ZVW40', '2011–2021', '2ZR-FXE гибрид'],
  [['NHP10'], 'Toyota', 'Aqua', 'Aqua (NHP10)', 'NHP10', '2011–2021', '1NZ-FXE гибрид'],
  [['NCP10', 'NCP13', 'SCP10'], 'Toyota', 'Vitz', 'Vitz / Yaris (XP10)', 'XP10', '1999–2005', '2SZ-FE / 1NZ-FE / 1SZ-FE'],
  [['KSP90', 'NCP91', 'NCP95', 'SCP90'], 'Toyota', 'Vitz', 'Vitz / Yaris (XP90)', 'XP90', '2005–2010', '1KR-FE / 1NZ-FE / 2SZ-FE'],
  [['KSP130', 'NSP130', 'NSP135', 'NCP131'], 'Toyota', 'Vitz', 'Vitz / Yaris (XP130)', 'XP130', '2010–2020', '1KR-FE / 1NR-FE / 1NZ-FE'],
  [['MCU10', 'MCU15', 'SXU10', 'SXU15'], 'Toyota', 'Harrier', 'Harrier (XU10)', 'XU10', '1997–2003', '1MZ-FE 3.0 / 5S-FE 2.2'],
  [['ACU30', 'ACU35', 'MCU30', 'MCU31', 'MCU35', 'MCU36', 'GSU30', 'GSU31', 'GSU35', 'GSU36', 'MHU38'], 'Toyota', 'Harrier', 'Harrier (XU30)', 'XU30', '2003–2013', '2AZ-FE / 1MZ-FE / 2GR-FE / гибрид'],
  [['ZSU60', 'ZSU65', 'ASU60', 'ASU65', 'AVU65'], 'Toyota', 'Harrier', 'Harrier (XU60)', 'XU60', '2013–2020', '3ZR-FAE / 8AR-FTS / гибрид'],
  [['MCU20', 'MCU25', 'ACU20', 'ACU25'], 'Toyota', 'Highlander', 'Highlander / Kluger V (XU20)', 'XU20', '2000–2007', '1MZ-FE 3.0 / 2AZ-FE 2.4'],
  [['GSU40', 'GSU45', 'ASU40', 'GVU48'], 'Toyota', 'Highlander', 'Highlander (XU40)', 'XU40', '2007–2013', '2GR-FE 3.5 / 1AR-FE 2.7 / гибрид'],
  [['GSU50', 'GSU55', 'ASU50', 'GVU58'], 'Toyota', 'Highlander', 'Highlander (XU50)', 'XU50', '2013–2019', '2GR-FE 3.5 / 1AR-FE 2.7 / гибрид'],
  [['GRJ120', 'GRJ121', 'KDJ120', 'KDJ121', 'TRJ120', 'RZJ120'], 'Toyota', 'Land Cruiser Prado', 'Land Cruiser Prado (J120)', 'J120', '2002–2009', '1GR-FE 4.0 / 1KD-FTV 3.0 / 2TR-FE 2.7'],
  [['GRJ150', 'GRJ151', 'TRJ150', 'KDJ150', 'GDJ150', 'GDJ151'], 'Toyota', 'Land Cruiser Prado', 'Land Cruiser Prado (J150)', 'J150', '2009–2024', '1GR-FE 4.0 / 2TR-FE 2.7 / 1KD-FTV / 1GD-FTV 2.8'],
  [['UZJ100', 'HDJ100', 'HDJ101'], 'Toyota', 'Land Cruiser', 'Land Cruiser 100 (J100)', 'J100', '1998–2007', '2UZ-FE 4.7 / 1HD-FTE 4.2D'],
  [['UZJ200', 'URJ200', 'URJ202', 'VDJ200'], 'Toyota', 'Land Cruiser', 'Land Cruiser 200 (J200)', 'J200', '2007–2021', '2UZ-FE / 1UR-FE / 3UR-FE / 1VD-FTV'],
  [['VJA300', 'FJA300'], 'Toyota', 'Land Cruiser', 'Land Cruiser 300 (J300)', 'J300', '2021–н.в.', 'V35A-FTS 3.5T / F33A-FTV 3.3D'],
  [['ANH10', 'ANH15', 'MNH10', 'MNH15', 'ATH10'], 'Toyota', 'Alphard', 'Alphard (AH10)', 'AH10', '2002–2008', '2AZ-FE 2.4 / 1MZ-FE 3.0 / гибрид'],
  [['ANH20', 'ANH25', 'GGH20', 'GGH25', 'ATH20'], 'Toyota', 'Alphard', 'Alphard / Vellfire (AH20)', 'AH20', '2008–2015', '2AZ-FE 2.4 / 2GR-FE 3.5 / гибрид'],
  [['AGH30', 'AGH35', 'GGH30', 'GGH35', 'AYH30'], 'Toyota', 'Alphard', 'Alphard / Vellfire (AH30)', 'AH30', '2015–2023', '2AR-FE 2.5 / 2GR-FKS 3.5 / гибрид'],
  [['AZR60', 'AZR65'], 'Toyota', 'Noah', 'Noah / Voxy (R60)', 'R60', '2001–2007', '1AZ-FSE 2.0'],
  [['ZRR70', 'ZRR75'], 'Toyota', 'Noah', 'Noah / Voxy (R70)', 'R70', '2007–2014', '3ZR-FE 2.0'],
  [['ZRR80', 'ZRR85', 'ZWR80'], 'Toyota', 'Noah', 'Noah / Voxy / Esquire (R80)', 'R80', '2014–2021', '3ZR-FAE 2.0 / гибрид'],
  [['ACR50', 'ACR55', 'GSR50', 'GSR55', 'AHR20'], 'Toyota', 'Estima', 'Estima (XR50)', 'XR50', '2006–2019', '2AZ-FE 2.4 / 2GR-FE 3.5 / гибрид'],
  [['NZT240', 'ZZT240', 'ZZT245', 'AZT240'], 'Toyota', 'Premio', 'Premio / Allion (T240)', 'T240', '2001–2007', '1NZ-FE / 1ZZ-FE / 1AZ-FSE'],
  [['NZT260', 'ZRT260', 'ZRT261', 'ZRT265'], 'Toyota', 'Premio', 'Premio / Allion (T260)', 'T260', '2007–2021', '1NZ-FE / 2ZR-FE / 3ZR-FAE'],
  [['GRX120', 'GRX121', 'GRX125'], 'Toyota', 'Mark X', 'Mark X (X120)', 'X120', '2004–2009', '4GR-FSE 2.5 / 3GR-FSE 3.0'],
  [['GRX130', 'GRX133', 'GRX135'], 'Toyota', 'Mark X', 'Mark X (X130)', 'X130', '2009–2019', '4GR-FSE 2.5 / 2GR-FSE 3.5'],
  [['GX110', 'JZX110'], 'Toyota', 'Mark II', 'Mark II (X110)', 'X110', '2000–2004', '1G-FE 2.0 / 1JZ 2.5'],
  [['GRS180', 'GRS182', 'GRS183', 'GRS184'], 'Toyota', 'Crown', 'Crown (S180)', 'S180', '2003–2008', '4GR-FSE / 3GR-FSE / 2GR-FSE'],
  [['GRS200', 'GRS202', 'GRS203', 'GRS204'], 'Toyota', 'Crown', 'Crown (S200)', 'S200', '2008–2012', '4GR-FSE / 2GR-FSE'],
  [['ZNE10', 'ZNE14', 'ANE10', 'ANE11'], 'Toyota', 'Wish', 'Wish (AE10)', 'AE10', '2003–2009', '1ZZ-FE 1.8 / 1AZ-FSE 2.0'],
  [['ZGE20', 'ZGE21', 'ZGE22', 'ZGE25'], 'Toyota', 'Wish', 'Wish (AE20)', 'AE20', '2009–2017', '2ZR-FAE 1.8 / 3ZR-FAE 2.0'],
  [['NCP50', 'NCP51', 'NCP55', 'NCP58', 'NCP59'], 'Toyota', 'Probox', 'Probox / Succeed (XP50)', 'XP50', '2002–2014', '1NZ-FE / 2NZ-FE'],
  [['NCP160', 'NCP165', 'NHP160', 'NSP160'], 'Toyota', 'Probox', 'Probox / Succeed (XP160)', 'XP160', '2014–н.в.', '1NZ-FE / 1NR-FE / гибрид'],
  [['NCP81', 'NCP85'], 'Toyota', 'Sienta', 'Sienta (XP80)', 'XP80', '2003–2015', '1NZ-FE 1.5'],
  [['NSP170', 'NCP175', 'NHP170'], 'Toyota', 'Sienta', 'Sienta (XP170)', 'XP170', '2015–2022', '2NR-FKE / 1NZ-FE / гибрид'],
  [['NCP100', 'NCP105', 'SCP100'], 'Toyota', 'Ractis', 'Ractis (XP100)', 'XP100', '2005–2010', '1NZ-FE / 2SZ-FE'],
  [['ZYX10', 'ZYX11', 'NGX50', 'NGX10'], 'Toyota', 'C-HR', 'C-HR (AX10/AX50)', 'AX10', '2016–2023', 'гибрид 1.8 / 8NR-FTS 1.2T'],
  [['KDH200', 'KDH201', 'KDH205', 'KDH206', 'TRH200', 'TRH214', 'TRH219'], 'Toyota', 'HiAce', 'HiAce (H200)', 'H200', '2004–2019', '1KD-FTV 3.0D / 1TR-FE / 2TR-FE'],
  // Lexus
  [['MCU15'], 'Lexus', 'RX', 'Lexus RX 300 (XU10)', 'XU10', '1998–2003', '1MZ-FE 3.0'],
  [['MCU35', 'MCU38', 'GSU35', 'GSU38', 'MHU38'], 'Lexus', 'RX', 'Lexus RX 300/330/350/400h (XU30)', 'XU30', '2003–2008', '1MZ-FE / 3MZ-FE / 2GR-FE / гибрид'],
  [['GGL10', 'GGL15', 'GGL16', 'AGL10', 'GYL10', 'GYL15', 'GYL16'], 'Lexus', 'RX', 'Lexus RX (AL10)', 'AL10', '2008–2015', '2GR-FE 3.5 / 1AR-FE 2.7 / гибрид'],
  [['GGL20', 'GGL25', 'AGL20', 'AGL25', 'GYL20', 'GYL25'], 'Lexus', 'RX', 'Lexus RX (AL20)', 'AL20', '2015–2022', '2GR-FKS 3.5 / 8AR-FTS 2.0T / гибрид'],
  [['UZJ100'], 'Lexus', 'LX', 'Lexus LX 470 (J100)', 'J100', '1998–2007', '2UZ-FE 4.7'],
  [['URJ201'], 'Lexus', 'LX', 'Lexus LX 570 (J200)', 'J200', '2007–2021', '3UR-FE 5.7'],
  [['VJA310'], 'Lexus', 'LX', 'Lexus LX 600 (J310)', 'J310', '2021–н.в.', 'V35A-FTS 3.5T'],
  [['UZJ120'], 'Lexus', 'GX', 'Lexus GX 470 (J120)', 'J120', '2002–2009', '2UZ-FE 4.7'],
  [['URJ150'], 'Lexus', 'GX', 'Lexus GX 460 (J150)', 'J150', '2009–2023', '1UR-FE 4.6'],
  [['GSV40'], 'Lexus', 'ES', 'Lexus ES 350 (XV40)', 'XV40', '2006–2012', '2GR-FE 3.5'],
  [['GSV40'], 'Toyota', 'Camry', 'Camry 3.5 (XV40)', 'XV40', '2006–2011', '2GR-FE 3.5'],
  [['GSV60', 'ASV60', 'AVV60'], 'Lexus', 'ES', 'Lexus ES (XV60)', 'XV60', '2012–2018', '2GR-FE / 2AR-FE / гибрид'],
  [['GSE20', 'GSE21', 'GSE25', 'ALE20'], 'Lexus', 'IS', 'Lexus IS (XE20)', 'XE20', '2005–2013', '4GR-FSE 2.5 / 2GR-FSE 3.5'],
  [['GSE30', 'GSE31', 'ASE30', 'AVE30'], 'Lexus', 'IS', 'Lexus IS (XE30)', 'XE30', '2013–н.в.', '4GR-FSE / 8AR-FTS / гибрид'],
  [['AGZ10', 'AGZ15', 'AYZ10', 'AYZ15'], 'Lexus', 'NX', 'Lexus NX (AZ10)', 'AZ10', '2014–2021', '8AR-FTS 2.0T / гибрид'],
  [['GRS190', 'GRS191', 'GRS196', 'GWS191'], 'Lexus', 'GS', 'Lexus GS (S190)', 'S190', '2005–2011', '3GR-FSE / 2GR-FSE / гибрид'],
  [['USF40', 'USF41', 'USF45', 'UVF45'], 'Lexus', 'LS', 'Lexus LS (XF40)', 'XF40', '2006–2017', '1UR-FSE 4.6 / гибрид'],
  // Honda
  [['GD1', 'GD2', 'GD3', 'GD4'], 'Honda', 'Fit', 'Fit / Jazz (GD, 1-е пок.)', 'GD', '2001–2007', 'L13A 1.3 / L15A 1.5'],
  [['GE6', 'GE7', 'GE8', 'GE9', 'GP1', 'GP4'], 'Honda', 'Fit', 'Fit / Jazz (GE, 2-е пок.)', 'GE', '2007–2013', 'L13A 1.3 / L15A 1.5 / гибрид'],
  [['GK3', 'GK4', 'GK5', 'GK6', 'GP5', 'GP6'], 'Honda', 'Fit', 'Fit / Jazz (GK, 3-е пок.)', 'GK', '2013–2020', 'L13B 1.3 / L15B 1.5 / гибрид'],
  [['RD1', 'RD2'], 'Honda', 'CR-V', 'CR-V (RD1, 1-е пок.)', 'RD1', '1995–2001', 'B20B 2.0'],
  [['RD4', 'RD5', 'RD7'], 'Honda', 'CR-V', 'CR-V (RD, 2-е пок.)', 'RD', '2001–2006', 'K20A 2.0 / K24A 2.4'],
  [['RE3', 'RE4'], 'Honda', 'CR-V', 'CR-V (RE, 3-е пок.)', 'RE', '2006–2011', 'R20A 2.0 / K24Z 2.4'],
  [['RM1', 'RM4'], 'Honda', 'CR-V', 'CR-V (RM, 4-е пок.)', 'RM', '2011–2016', 'R20A 2.0 / K24Z 2.4'],
  [['RW1', 'RW2', 'RT5', 'RT6'], 'Honda', 'CR-V', 'CR-V (RW, 5-е пок.)', 'RW', '2016–2022', 'L15B 1.5T / гибрид'],
  [['RB1', 'RB2'], 'Honda', 'Odyssey', 'Odyssey (RB1, 3-е пок.)', 'RB1', '2003–2008', 'K24A 2.4'],
  [['RB3', 'RB4'], 'Honda', 'Odyssey', 'Odyssey (RB3, 4-е пок.)', 'RB3', '2008–2013', 'K24A 2.4'],
  [['RC1', 'RC2', 'RC4'], 'Honda', 'Odyssey', 'Odyssey (RC, 5-е пок.)', 'RC', '2013–2022', 'K24W 2.4 / гибрид'],
  [['RG1', 'RG2', 'RG3', 'RG4'], 'Honda', 'Stepwgn', 'Stepwgn (RG)', 'RG', '2005–2009', 'K20A 2.0 / K24A 2.4'],
  [['RK1', 'RK2', 'RK5', 'RK6'], 'Honda', 'Stepwgn', 'Stepwgn (RK)', 'RK', '2009–2015', 'R20A 2.0'],
  [['GB3', 'GB4', 'GP3'], 'Honda', 'Freed', 'Freed (GB3)', 'GB3', '2008–2016', 'L15A 1.5 / гибрид'],
  [['GB5', 'GB6', 'GB7', 'GB8'], 'Honda', 'Freed', 'Freed (GB5)', 'GB5', '2016–2024', 'L15B 1.5 / гибрид'],
  [['RU1', 'RU2', 'RU3', 'RU4'], 'Honda', 'Vezel', 'Vezel / HR-V (RU)', 'RU', '2013–2021', 'L15B 1.5 / гибрид'],
  [['ZE2', 'ZE3'], 'Honda', 'Insight', 'Insight (ZE2)', 'ZE2', '2009–2014', 'LDA гибрид 1.3'],
  [['CL7', 'CL8', 'CL9'], 'Honda', 'Accord', 'Accord (CL, 7-е пок.)', 'CL', '2002–2008', 'K20A 2.0 / K24A 2.4'],
  [['CU1', 'CU2'], 'Honda', 'Accord', 'Accord (CU, 8-е пок.)', 'CU', '2008–2013', 'R20A 2.0 / K24Z 2.4'],
  [['FD1', 'FD2', 'FD3'], 'Honda', 'Civic', 'Civic (FD, 8-е пок.)', 'FD', '2005–2011', 'R18A 1.8 / K20A 2.0 / гибрид'],
  [['RN1', 'RN2', 'RN3', 'RN4', 'RN5'], 'Honda', 'Stream', 'Stream (RN1)', 'RN1', '2000–2006', 'D17A 1.7 / K20A 2.0'],
  [['RN6', 'RN7', 'RN8', 'RN9'], 'Honda', 'Stream', 'Stream (RN6)', 'RN6', '2006–2014', 'R18A 1.8 / R20A 2.0'],
  [['GJ1', 'GJ2'], 'Honda', 'Airwave', 'Airwave (GJ)', 'GJ', '2005–2010', 'L15A 1.5'],
  // Nissan
  [['E11', 'NE11', 'ZE11'], 'Nissan', 'Note', 'Note (E11)', 'E11', '2005–2012', 'HR15DE 1.5'],
  [['E12', 'NE12', 'HE12', 'SNE12'], 'Nissan', 'Note', 'Note (E12)', 'E12', '2012–2020', 'HR12DE / HR12DDR / e-Power'],
  [['K12', 'AK12', 'BK12', 'YK12'], 'Nissan', 'March', 'March / Micra (K12)', 'K12', '2002–2010', 'CR12DE / HR15DE'],
  [['K13', 'NK13'], 'Nissan', 'March', 'March / Micra (K13)', 'K13', '2010–2022', 'HR12DE 1.2'],
  [['C11', 'JC11', 'NC11', 'SC11'], 'Nissan', 'Tiida', 'Tiida / Tiida Latio (C11)', 'C11', '2004–2012', 'HR15DE / MR18DE'],
  [['T30', 'NT30', 'PNT30'], 'Nissan', 'X-Trail', 'X-Trail (T30)', 'T30', '2000–2007', 'QR20DE / QR25DE'],
  [['T31', 'NT31', 'TNT31', 'DNT31'], 'Nissan', 'X-Trail', 'X-Trail (T31)', 'T31', '2007–2013', 'MR20DE / QR25DE / M9R дизель'],
  [['T32', 'NT32', 'HT32', 'HNT32'], 'Nissan', 'X-Trail', 'X-Trail / Rogue (T32)', 'T32', '2013–2022', 'MR20DD / QR25DE / гибрид'],
  [['Z50', 'PZ50', 'TZ50', 'PNZ50'], 'Nissan', 'Murano', 'Murano (Z50)', 'Z50', '2002–2008', 'VQ35DE 3.5 / QR25DE'],
  [['Z51', 'TZ51', 'PNZ51', 'TNZ51'], 'Nissan', 'Murano', 'Murano (Z51)', 'Z51', '2008–2014', 'VQ35DE 3.5 / QR25DE'],
  [['J31', 'PJ31', 'TJ31', 'TNJ31'], 'Nissan', 'Teana', 'Teana (J31)', 'J31', '2003–2008', 'VQ23DE / VQ35DE'],
  [['J32', 'TNJ32', 'PJ32'], 'Nissan', 'Teana', 'Teana (J32)', 'J32', '2008–2014', 'QR25DE / VQ25DE / VQ35DE'],
  [['C25', 'CC25', 'NC25', 'CNC25'], 'Nissan', 'Serena', 'Serena (C25)', 'C25', '2005–2010', 'MR20DE 2.0'],
  [['C26', 'FC26', 'FNC26', 'HC26', 'HFC26', 'NC26'], 'Nissan', 'Serena', 'Serena (C26)', 'C26', '2010–2016', 'MR20DD 2.0 / S-Hybrid'],
  [['C27', 'GC27', 'GFC27', 'HC27', 'HFC27'], 'Nissan', 'Serena', 'Serena (C27)', 'C27', '2016–2022', 'MR20DD / e-Power'],
  [['Y61', 'WGY61', 'WRGY61', 'WTY61'], 'Nissan', 'Patrol', 'Patrol / Safari (Y61)', 'Y61', '1997–2010', 'TB48DE / ZD30 / TB45'],
  [['Y62', 'JPY62'], 'Nissan', 'Patrol', 'Patrol (Y62)', 'Y62', '2010–н.в.', 'VK56VD 5.6'],
  [['J10', 'KJ10', 'NJ10', 'KNJ10'], 'Nissan', 'Qashqai', 'Qashqai / Dualis (J10)', 'J10', '2007–2013', 'MR20DE 2.0 / HR16DE'],
  [['F15', 'YF15', 'NF15'], 'Nissan', 'Juke', 'Juke (F15)', 'F15', '2010–2019', 'HR15DE / MR16DDT'],
  [['Z11', 'BZ11', 'YZ11', 'BNZ11'], 'Nissan', 'Cube', 'Cube (Z11)', 'Z11', '2002–2008', 'CR14DE / HR15DE'],
  [['Z12', 'NZ12'], 'Nissan', 'Cube', 'Cube (Z12)', 'Z12', '2008–2020', 'HR15DE 1.5'],
  [['Y12', 'NY12', 'JY12'], 'Nissan', 'Wingroad', 'Wingroad / AD (Y12)', 'Y12', '2005–2018', 'HR15DE / MR18DE'],
  [['N16', 'FN16', 'QN16'], 'Nissan', 'Almera', 'Almera / Bluebird Sylphy (N16)', 'N16', '2000–2006', 'QG15DE / QG18DE'],
  [['P12', 'TP12', 'QP12', 'RP12'], 'Nissan', 'Primera', 'Primera (P12)', 'P12', '2001–2008', 'QR20DE / QR25DE'],
  [['ZE0', 'AZE0'], 'Nissan', 'Leaf', 'Leaf (ZE0)', 'ZE0', '2010–2017', 'электро'],
  [['ZE1'], 'Nissan', 'Leaf', 'Leaf (ZE1)', 'ZE1', '2017–н.в.', 'электро'],
  [['E51', 'NE51', 'ME51', 'MNE51'], 'Nissan', 'Elgrand', 'Elgrand (E51)', 'E51', '2002–2010', 'VQ35DE / VQ25DE'],
  [['E52', 'TE52', 'TNE52', 'PE52', 'PNE52'], 'Nissan', 'Elgrand', 'Elgrand (E52)', 'E52', '2010–н.в.', 'QR25DE / VQ35DE'],
  // Subaru
  [['SF5', 'SF9'], 'Subaru', 'Forester', 'Forester (SF, 1-е пок.)', 'SF', '1997–2002', 'EJ20 2.0 / EJ25'],
  [['SG5', 'SG9'], 'Subaru', 'Forester', 'Forester (SG, 2-е пок.)', 'SG', '2002–2007', 'EJ20 / EJ25'],
  [['SH5', 'SH9', 'SHJ'], 'Subaru', 'Forester', 'Forester (SH, 3-е пок.)', 'SH', '2007–2012', 'EJ20 / EJ25 / FB20'],
  [['SJ5', 'SJG'], 'Subaru', 'Forester', 'Forester (SJ, 4-е пок.)', 'SJ', '2012–2018', 'FB20 / FA20 турбо'],
  [['SK5', 'SK9', 'SKE'], 'Subaru', 'Forester', 'Forester (SK, 5-е пок.)', 'SK', '2018–н.в.', 'FB25 / гибрид e-Boxer'],
  [['BP5', 'BP9', 'BPE', 'BPH', 'BL5', 'BL9', 'BLE'], 'Subaru', 'Legacy', 'Legacy / Outback (BL/BP)', 'BL/BP', '2003–2009', 'EJ20 / EJ25 / EZ30'],
  [['BR9', 'BRM', 'BRF', 'BRG', 'BM9', 'BMM', 'BMG'], 'Subaru', 'Legacy', 'Legacy / Outback (BM/BR)', 'BM/BR', '2009–2014', 'EJ25 / FB25 / EZ36'],
  [['BS9', 'BN9'], 'Subaru', 'Outback', 'Outback / Legacy B4 (BS/BN)', 'BS/BN', '2014–2020', 'FB25 2.5'],
  [['GDA', 'GDB', 'GG2', 'GG3', 'GGA', 'GGB', 'GD2', 'GD3', 'GD9', 'GG9'], 'Subaru', 'Impreza', 'Impreza (GD/GG, 2-е пок.)', 'GD/GG', '2000–2007', 'EJ15 / EJ20'],
  [['GE2', 'GE3', 'GE6', 'GE7', 'GH2', 'GH3', 'GH6', 'GH7', 'GH8', 'GRB', 'GRF'], 'Subaru', 'Impreza', 'Impreza (GE/GH, 3-е пок.)', 'GE/GH', '2007–2011', 'EL15 / EJ20'],
  [['GJ2', 'GJ3', 'GJ6', 'GJ7', 'GP2', 'GP3', 'GP6', 'GP7', 'GPE'], 'Subaru', 'Impreza', 'Impreza / XV (GJ/GP, 4-е пок.)', 'GJ/GP', '2011–2016', 'FB16 / FB20 / гибрид'],
  [['GT2', 'GT3', 'GT6', 'GT7', 'GK2', 'GK3', 'GK6', 'GK7'], 'Subaru', 'Impreza', 'Impreza / XV (GK/GT, 5-е пок.)', 'GK/GT', '2016–2023', 'FB16 / FB20'],
  [['VM4', 'VMG'], 'Subaru', 'Levorg', 'Levorg (VM)', 'VM', '2014–2020', 'FB16 турбо / FA20 турбо'],
  // Mitsubishi
  [['CW5W', 'CW6W', 'CW4W'], 'Mitsubishi', 'Outlander', 'Outlander (XL, 2-е пок.)', 'XL', '2005–2012', '4B12 2.4 / 6B31 3.0'],
  [['GF7W', 'GF8W', 'GG2W'], 'Mitsubishi', 'Outlander', 'Outlander (GF/GG, 3-е пок.)', 'GF', '2012–2021', '4B11 / 4B12 / PHEV'],
  [['CY4A', 'CY3A', 'CX4A'], 'Mitsubishi', 'Lancer', 'Lancer (X)', 'X', '2007–2017', '4B11 2.0 / 4A91 1.5'],
  [['CS2A', 'CS5A', 'CS5W'], 'Mitsubishi', 'Lancer', 'Lancer Cedia (IX)', 'IX', '2000–2007', '4G15 / 4G93 / 4G94'],
  [['V73W', 'V75W', 'V77W', 'V78W', 'V63W', 'V65W', 'V68W'], 'Mitsubishi', 'Pajero', 'Pajero (3-е пок.)', 'V60/V70', '1999–2006', '6G72 / 6G74 / 4M41'],
  [['V83W', 'V87W', 'V88W', 'V93W', 'V97W', 'V98W'], 'Mitsubishi', 'Pajero', 'Pajero (4-е пок.)', 'V80/V90', '2006–2021', '6G75 3.8 / 4M41 3.2D'],
  [['CV1W', 'CV2W', 'CV4W', 'CV5W'], 'Mitsubishi', 'Delica', 'Delica D:5 (CV)', 'CV', '2007–н.в.', '4B11 / 4B12 / 4N14D'],
  [['GA3W', 'GA4W', 'GA1W', 'GA2W'], 'Mitsubishi', 'ASX', 'RVR / ASX (GA)', 'GA', '2010–н.в.', '4B10 / 4B11 / 4J10'],
  [['Z21A', 'Z22A', 'Z23A', 'Z25A', 'Z27A', 'Z27AG'], 'Mitsubishi', 'Colt', 'Colt (Z20)', 'Z20', '2002–2012', '4A90 / 4A91'],
  // Mazda
  [['DY3W', 'DY5W', 'DY3R', 'DY5R'], 'Mazda', 'Demio', 'Demio / Mazda2 (DY)', 'DY', '2002–2007', 'ZJ-VE 1.3 / ZY-VE 1.5'],
  [['DE3FS', 'DE5FS', 'DEJFS', 'DE3AS'], 'Mazda', 'Demio', 'Demio / Mazda2 (DE)', 'DE', '2007–2014', 'ZJ-VE / ZY-VE / P3-VPS'],
  [['DJ3FS', 'DJ5FS', 'DJLFS', 'DJ3AS', 'DJ5AS'], 'Mazda', 'Demio', 'Demio / Mazda2 (DJ)', 'DJ', '2014–н.в.', 'P3-VPS / P5-VPS / S5-DPTS'],
  [['BK3P', 'BK5P', 'BKEP', 'BK5P'], 'Mazda', 'Axela', 'Axela / Mazda3 (BK)', 'BK', '2003–2009', 'ZY-VE / LF-VE / L3-VE'],
  [['BL5FP', 'BLEFP', 'BLFFP', 'BL5FW', 'BLEAW'], 'Mazda', 'Axela', 'Axela / Mazda3 (BL)', 'BL', '2009–2013', 'ZY-VE / LF-VDS / L3'],
  [['BM5FP', 'BMEFS', 'BM5FS', 'BYEFP', 'BMLFS'], 'Mazda', 'Axela', 'Axela / Mazda3 (BM)', 'BM', '2013–2019', 'P5-VPS / PE-VPS / гибрид'],
  [['GG3S', 'GGES', 'GG3P', 'GGEP', 'GY3W', 'GYEW'], 'Mazda', 'Atenza', 'Atenza / Mazda6 (GG/GY)', 'GG', '2002–2008', 'L3-VE 2.3 / LF-DE 2.0'],
  [['GH5FS', 'GHEFP', 'GH5FP', 'GH5FW', 'GHEFW', 'GH5AP'], 'Mazda', 'Atenza', 'Atenza / Mazda6 (GH)', 'GH', '2008–2012', 'LF-VD 2.0 / L5-VE 2.5'],
  [['GJ2FP', 'GJEFP', 'GJ5FP', 'GJ2FW', 'GJEFW', 'GJ5FW', 'GJ2AP'], 'Mazda', 'Atenza', 'Atenza / Mazda6 (GJ)', 'GJ', '2012–н.в.', 'PE-VPS / PY-VPS / SH-VPTS'],
  [['KE2FW', 'KEEFW', 'KE5FW', 'KE2AW', 'KE5AW', 'KEEAW'], 'Mazda', 'CX-5', 'CX-5 (KE, 1-е пок.)', 'KE', '2012–2017', 'PE-VPS 2.0 / PY-VPS 2.5 / SH-VPTS 2.2D'],
  [['KF2P', 'KFEP', 'KF5P'], 'Mazda', 'CX-5', 'CX-5 (KF, 2-е пок.)', 'KF', '2017–н.в.', 'PE-VPS / PY-VPS / SH-VPTS'],
  [['ER3P'], 'Mazda', 'CX-7', 'CX-7 (ER)', 'ER', '2006–2012', 'L3-VDT 2.3 турбо'],
  [['LY3P'], 'Mazda', 'MPV', 'MPV (LY)', 'LY', '2006–2016', 'L3-VE / L3-VDT'],
  [['CREW', 'CR3W'], 'Mazda', 'Premacy', 'Premacy / Mazda5 (CR)', 'CR', '2005–2010', 'LF-DE 2.0 / L3-VE'],
  [['CWEFW', 'CWFFW', 'CWEAW'], 'Mazda', 'Premacy', 'Premacy / Mazda5 (CW)', 'CW', '2010–2018', 'LF-VD / PE-VPS'],
];

export interface FrameMatch {
  code: string;
  brand: string;
  model: string;
  title: string;
  generation: string;
  years: string;
  engine: string;
}

const INDEX = new Map<string, FrameMatch[]>();
for (const [codes, brand, model, title, generation, years, engine] of ROWS) {
  for (const code of codes) {
    const list = INDEX.get(code) || [];
    if (!list.some((m) => m.brand === brand && m.title === title)) list.push({ code, brand, model, title, generation, years, engine });
    INDEX.set(code, list);
  }
}
const CODES_BY_LENGTH = [...INDEX.keys()].sort((a, b) => b.length - a.length);

/** "NZE141-1234567" / "nze1411234567" / "GE6-1234567" -> matching models (longest code wins) */
export function decodeFrame(raw: string): FrameMatch[] {
  const q = raw.toUpperCase().replace(/\s/g, '');
  const head = q.split('-')[0];
  // Exact code before the dash first, then the longest known code the number starts with
  if (INDEX.has(head)) return INDEX.get(head)!;
  const code = CODES_BY_LENGTH.find((c) => q.startsWith(c) && /\d/.test(q.slice(c.length, c.length + 1) || '0'));
  return code ? INDEX.get(code)! : [];
}

export const FRAME_CODES_COUNT = INDEX.size;
