-- Migration 10: Add phone column to students and bulk-import student roster
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)

-- 1. Add phone column to students table
alter table public.students
  add column if not exists phone text;

-- 2. Idempotent bulk import of 99 students with their phone numbers
do $$
declare
  rec record;
  v_existing_id uuid;
begin
  for rec in
    select * from (values
      ('Olutominiyi Rachael Peace', '08103569660'),
      ('Adeogun Temiloluwa', '09037513462'),
      ('Adejo David Eneojo', '07061119813'),
      ('Bamidele Praise Oluwapamilerin', '09114835800'),
      ('Akinbola Damilare', '08101699738'),
      ('Olawoyin Lydia Temitayo', '07052101337'),
      ('Enioluwa', '09058505620'),
      ('Amosun Fiyinfoluwa N.', '07038160485'),
      ('Owolabi Grace O.', '09049799640'),
      ('Adeoye Elijah Mayowa', '07073561766'),
      ('Olagoke James Feranmi', '08023151921'),
      ('Adeniji Dorcas Iyanuoluwa', '08122363503'),
      ('Onidare Ayomide Victoria', '07046570225'),
      ('Animasahun Esther Okikiola', '09048870777'),
      ('Abioye Adeola Rachael', '09131502532'),
      ('Tasanmi Jesunifemi Favour', '08084046004'),
      ('Ogunlana Oluwanifemi Elizabeth', '07012622560'),
      ('Adeniyi Joshua Adewale', '09116952036'),
      ('Amao Samuel Surprise', '09156009223'),
      ('Opinosinuola Epiphany', '08065184739'),
      ('Okanlawon Joseph', '07066210985'),
      ('Ayoola Oyindamola', '08131374179'),
      ('Ayodele Emmanuel', '08089661351'),
      ('Oluwajire Okikijesu J.', '07048863969'),
      ('David Deborah', '09049821008'),
      ('Ohikhokhai Dorcas', '08116863309'),
      ('Adeleke Opemipo', '08027703217'),
      ('Agbenyo Precious', '09123098800'),
      ('Adebukola Rejoice', '09035437621'),
      ('Oludare Peter', '08148360844'),
      ('Adebisi-Adeolu Grace', '09069588655'),
      ('Omolewa John', '08167552292'),
      ('Omoloja Stephen Timilehin', '09138111828'),
      ('Oladipupo Elujoba', '08039901239'),
      ('Olayinka-Adeosun Desmond C.', '07062794622'),
      ('Deborah David', '08169246877'),
      ('Adegbile Ezekiel', '08107155321'),
      ('Oladipupo Deborah Pelumi', '09041948256'),
      ('Olaniyi Daniel Adekunle', '07089580916'),
      ('Oladapo Ayomide Oluwapelumi', '07071020878'),
      ('Akinyemi Demilade', '08105764878'),
      ('Success', '09059563224'),
      ('Akinremi Goodness', '07039456809'),
      ('Olasupo Esther', '09125611598'),
      ('Adeniji Goodness', '08121862286'),
      ('Shodunke Omotoyosi', '08088433693'),
      ('Ali Godiya', '07048580298'),
      ('Fajuyi Israel', '09151686025'),
      ('Awoyode David', '09067929561'),
      ('Farotimi Rachael', '08021321464'),
      ('Apagida Peace', '07017633822'),
      ('Balogun Regina Tijesunimi', '07070513031'),
      ('Salami Kolade', '09059289673'),
      ('Oladunjoye Deborah', '08072537332'),
      ('Olaniran Dorcas', '08147223704'),
      ('Babawarun Oluwaseyanu Samuel', '08066853293'),
      ('Adeniran Rebecca', '07076313007'),
      ('Adeleke Jeremiah Oyedeji', '08080539946'),
      ('Adeniran Privilege Temiloluwa', '09167880701'),
      ('Jaiyeola Albert', '09026216579'),
      ('Adewale Emmanuel', '08159540892'),
      ('Ikujenlola Victor', '08125607810'),
      ('Olarinoye Deborah Olayemi', '09054195605'),
      ('Morounfolu Oyindamola Mosadoluwa', '09049732549'),
      ('Ajayi Deborah Oluwatobi', '08100074892'),
      ('Gbolagade Omowunmi Aliyat', '07061127956'),
      ('Bode Olamilekan', '09112436483'),
      ('OLAJIDE Solomon Adesoji', '09051735034'),
      ('Lawal Kingsley Olajuwon', '07016907086'),
      ('ADEOYE OLUWAFEYIKEMI GRACE', '09074348854'),
      ('OYEDEJI TEMILOLUWA ELIZABETH', '07063521934'),
      ('Adebanwo Williams Adeshina', '08152593111'),
      ('OKUNOLA ADESOLA GRACE', '09018926528'),
      ('Adeyemi Oluwatosin Ajibola', '08070436340'),
      ('Adebayo Gold', '09038167776'),
      ('Olatinkan Caleb O.', '08120982512'),
      ('Oladeu Favour E.', '07055812341'),
      ('Fakemi Oyindamola Esther', '09042825555'),
      ('Adeferokan Ruth Terra', '09020400352'),
      ('Asolo Oluwasemilore Stephen', '08125584816'),
      ('Paul Joy Dorcas', '07087843702'),
      ('Jimoh Israel Oluwagbenga', '07033926453'),
      ('Fakunwade Alise Boluwatife', '09039737071'),
      ('Egbewole Samuel Oluwanifemi', '09059107352'),
      ('Oyenide Abosede Omolorake', '09079273129'),
      ('Samson Adepoju', '+2348120827289'),
      ('Onisope Favour Oluwabukunmi', '08139398565'),
      ('AKINRINADE OLUWADAMILARE AYOADE', '08103831414'),
      ('Andrew Elijah Oluwatunmise', '08024341273'),
      ('ONDEYE DEBORAH', '09132690580'),
      ('Oluyemi Abigeal', '09066563442'),
      ('Bada Janet Oluwadasalami', '09045691861'),
      ('Egbewole Favour Esther', '07031503903'),
      ('Olayinka Emmanuel Olusegun', '07047507985'),
      ('Olajide Tunmise Joshua', '08135639655'),
      ('OLALEKE SAMUEL DAMILARE', '08142323814'),
      ('Parakoyi - Olusegun', '09162732654'),
      ('OLAWOYE PRINCESS OLUWADUNSI', '07073095068'),
      ('Isaac Temitope', '09125423075')
    ) as t(full_name, phone)
  loop
    select id into v_existing_id
    from public.students
    where lower(trim(full_name)) = lower(trim(rec.full_name))
    limit 1;

    if v_existing_id is not null then
      update public.students
      set phone = coalesce(nullif(trim(phone), ''), rec.phone),
          active = true
      where id = v_existing_id;
    else
      insert into public.students (full_name, phone, active)
      values (trim(rec.full_name), rec.phone, true);
    end if;
  end loop;
end $$;
