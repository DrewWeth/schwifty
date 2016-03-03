select ABPerson.ROWID
    , ABPerson.first
    , ABPerson.last
    , abperson.organization as organization
    , abperson.department as department
    , abperson.birthday as birthday
    , ABPerson.JobTitle as jobtitle
    , (select value from ABMultiValue where property = 3 and record_id = ABPerson.ROWID and label = (select ROWID from ABMultiValueLabel where value = '_$!<Work>!$_')) as phone_work
    , (select value from ABMultiValue where property = 3 and record_id = ABPerson.ROWID and label = (select ROWID from ABMultiValueLabel where value = '_$!<Mobile>!$_')) as phone_mobile
    , (select value from ABMultiValue where property = 3 and record_id = ABPerson.ROWID and label = (select ROWID from ABMultiValueLabel where value = '_$!<Home>!$_')) as phone_home
    , (select value from ABMultiValue where property = 4 and record_id = ABPerson.ROWID and label is null) as email
    , (select value from ABMultiValueEntry where parent_id in (select ROWID from ABMultiValue where record_id = ABPerson.ROWID) and key = (select ROWID from ABMultiValueEntryKey where lower(value) = 'street')) as address
    , (select value from ABMultiValueEntry where parent_id in (select ROWID from ABMultiValue where record_id = ABPerson.ROWID) and key = (select ROWID from ABMultiValueEntryKey where lower(value) = 'city')) as city
    from ABPerson
    order by ABPerson.ROWID
    ;
