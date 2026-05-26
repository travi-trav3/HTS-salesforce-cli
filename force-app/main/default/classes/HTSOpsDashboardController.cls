public with sharing class HTSOpsDashboardController {

    private static final Set<String> ACTIVE_STAGES = new Set<String>{
        'Pre-Mob', 'Executing', 'Demob'
    };

    public class DashboardData {
        @AuraEnabled public List<StageCount> stageCounts;
        @AuraEnabled public List<PoBalanceRow> poBalances;
        @AuraEnabled public List<OverdueGroup> overdueGates;
        @AuraEnabled public List<InvoiceRow> invoiceAging;
        @AuraEnabled public List<MobilizationRow> mobilizationCountdown;
        @AuraEnabled public List<MissingDataRow> missingPoData;
    }

    public class StageCount {
        @AuraEnabled public String stage;
        @AuraEnabled public Integer count;
        public StageCount(String s, Integer c) { stage = s; count = c; }
    }

    public class PoBalanceRow {
        @AuraEnabled public Id workOrderId;
        @AuraEnabled public String workOrderName;
        @AuraEnabled public String accountName;
        @AuraEnabled public Decimal totalContractValue;
        @AuraEnabled public Decimal remainingBalance;
        @AuraEnabled public Decimal percentRemaining;
        @AuraEnabled public String colorBand;
    }

    public class OverdueGroup {
        @AuraEnabled public Id workOrderId;
        @AuraEnabled public String workOrderName;
        @AuraEnabled public List<OverdueTaskRow> tasks;
    }

    public class OverdueTaskRow {
        @AuraEnabled public Id taskId;
        @AuraEnabled public String subject;
        @AuraEnabled public Date dueDate;
        @AuraEnabled public Integer daysOverdue;
        @AuraEnabled public String ownerName;
    }

    public class InvoiceRow {
        @AuraEnabled public Id workOrderId;
        @AuraEnabled public String workOrderName;
        @AuraEnabled public Date lastInvoiceDate;
        @AuraEnabled public Decimal daysSinceLastInvoice;
        @AuraEnabled public Boolean isStale;
    }

    public class MobilizationRow {
        @AuraEnabled public Id workOrderId;
        @AuraEnabled public String workOrderName;
        @AuraEnabled public Date mobilizationDate;
        @AuraEnabled public Decimal daysToMobilization;
        @AuraEnabled public Boolean isImminent;
    }

    public class MissingDataRow {
        @AuraEnabled public Id workOrderId;
        @AuraEnabled public String workOrderName;
        @AuraEnabled public Boolean missingPoNumber;
        @AuraEnabled public Boolean missingPoAmount;
        @AuraEnabled public Boolean missingMobDate;
    }

    @AuraEnabled(cacheable=true)
    public static DashboardData getDashboardData() {
        DashboardData data = new DashboardData();

        List<Project__c> activeProjects = [
            SELECT Id, Name, Stage__c,
                   Account__r.Name,
                   PO_Number__c, PO_Amount__c, Mobilization_Date__c,
                   Invoiced_Amount__c, CO_Total__c,
                   Total_Contract_Value__c, Remaining_Balance__c, Percent_Remaining__c,
                   Last_Invoice_Date__c, Days_Since_Last_Invoice__c,
                   Days_To_Mobilization__c, Has_Missing_PO_Data__c
            FROM Project__c
            WHERE Stage__c IN :ACTIVE_STAGES
            ORDER BY Name
            LIMIT 500
        ];

        Map<String, Integer> stageMap = new Map<String, Integer>{
            'Pre-Mob' => 0, 'Executing' => 0, 'Demob' => 0
        };
        List<PoBalanceRow> poRows = new List<PoBalanceRow>();
        List<InvoiceRow> invoiceRows = new List<InvoiceRow>();
        List<MobilizationRow> mobRows = new List<MobilizationRow>();
        List<MissingDataRow> missingRows = new List<MissingDataRow>();
        Set<Id> activeIds = new Set<Id>();

        for (Project__c p : activeProjects) {
            activeIds.add(p.Id);
            if (stageMap.containsKey(p.Stage__c)) {
                stageMap.put(p.Stage__c, stageMap.get(p.Stage__c) + 1);
            }

            PoBalanceRow po = new PoBalanceRow();
            po.workOrderId = p.Id;
            po.workOrderName = p.Name;
            po.accountName = p.Account__r != null ? p.Account__r.Name : null;
            po.totalContractValue = p.Total_Contract_Value__c;
            po.remainingBalance = p.Remaining_Balance__c;
            po.percentRemaining = p.Percent_Remaining__c;
            po.colorBand = bandFor(p.Percent_Remaining__c);
            poRows.add(po);

            InvoiceRow ir = new InvoiceRow();
            ir.workOrderId = p.Id;
            ir.workOrderName = p.Name;
            ir.lastInvoiceDate = p.Last_Invoice_Date__c;
            ir.daysSinceLastInvoice = p.Days_Since_Last_Invoice__c;
            ir.isStale = p.Days_Since_Last_Invoice__c != null && p.Days_Since_Last_Invoice__c > 14;
            invoiceRows.add(ir);

            if (p.Stage__c == 'Pre-Mob' && p.Mobilization_Date__c != null) {
                MobilizationRow mr = new MobilizationRow();
                mr.workOrderId = p.Id;
                mr.workOrderName = p.Name;
                mr.mobilizationDate = p.Mobilization_Date__c;
                mr.daysToMobilization = p.Days_To_Mobilization__c;
                mr.isImminent = p.Days_To_Mobilization__c != null && p.Days_To_Mobilization__c <= 7;
                mobRows.add(mr);
            }

            if (p.Has_Missing_PO_Data__c) {
                MissingDataRow md = new MissingDataRow();
                md.workOrderId = p.Id;
                md.workOrderName = p.Name;
                md.missingPoNumber = String.isBlank(p.PO_Number__c);
                md.missingPoAmount = (p.PO_Amount__c == null || p.PO_Amount__c == 0);
                md.missingMobDate = (p.Mobilization_Date__c == null);
                missingRows.add(md);
            }
        }

        mobRows.sort(new MobRowComparator());

        List<StageCount> stageCounts = new List<StageCount>();
        for (String s : new List<String>{'Pre-Mob', 'Executing', 'Demob'}) {
            stageCounts.add(new StageCount(s, stageMap.get(s)));
        }

        Map<Id, OverdueGroup> overdueByProject = new Map<Id, OverdueGroup>();
        if (!activeIds.isEmpty()) {
            for (Task t : [
                SELECT Id, Subject, ActivityDate, WhatId, Owner.Name
                FROM Task
                WHERE Is_Gate__c = true
                  AND Status != 'Completed'
                  AND ActivityDate < TODAY
                  AND WhatId IN :activeIds
                ORDER BY ActivityDate ASC
                LIMIT 500
            ]) {
                Id projectId = t.WhatId;
                OverdueGroup g = overdueByProject.get(projectId);
                if (g == null) {
                    g = new OverdueGroup();
                    g.workOrderId = projectId;
                    g.tasks = new List<OverdueTaskRow>();
                    overdueByProject.put(projectId, g);
                }
                OverdueTaskRow row = new OverdueTaskRow();
                row.taskId = t.Id;
                row.subject = t.Subject;
                row.dueDate = t.ActivityDate;
                row.daysOverdue = t.ActivityDate != null ? Date.today().daysBetween(t.ActivityDate) * -1 : null;
                row.ownerName = t.Owner != null ? (String) t.Owner.get('Name') : null;
                g.tasks.add(row);
            }
            for (Project__c p : activeProjects) {
                if (overdueByProject.containsKey(p.Id)) {
                    overdueByProject.get(p.Id).workOrderName = p.Name;
                }
            }
        }

        data.stageCounts = stageCounts;
        data.poBalances = poRows;
        data.overdueGates = overdueByProject.values();
        data.invoiceAging = invoiceRows;
        data.mobilizationCountdown = mobRows;
        data.missingPoData = missingRows;
        return data;
    }

    private static String bandFor(Decimal pct) {
        if (pct == null) return 'neutral';
        if (pct < 20) return 'red';
        if (pct <= 40) return 'yellow';
        return 'green';
    }

    public class MobRowComparator implements System.Comparator<MobilizationRow> {
        public Integer compare(MobilizationRow a, MobilizationRow b) {
            Decimal av = a.daysToMobilization == null ? 999999 : a.daysToMobilization;
            Decimal bv = b.daysToMobilization == null ? 999999 : b.daysToMobilization;
            if (av < bv) return -1;
            if (av > bv) return 1;
            return 0;
        }
    }
}
