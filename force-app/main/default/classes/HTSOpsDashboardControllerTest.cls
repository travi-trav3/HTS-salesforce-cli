@isTest
private class HTSOpsDashboardControllerTest {

    @testSetup
    static void setupData() {
        Account a = new Account(Name = 'Test Customer');
        insert a;

        List<Project__c> projects = new List<Project__c>{
            new Project__c(
                Account__c = a.Id,
                Stage__c = 'Pre-Mob',
                PO_Number__c = 'PO-001',
                PO_Amount__c = 100000,
                Invoiced_Amount__c = 80000,
                Mobilization_Date__c = Date.today().addDays(5),
                Last_Invoice_Date__c = Date.today().addDays(-20)
            ),
            new Project__c(
                Account__c = a.Id,
                Stage__c = 'Executing',
                PO_Number__c = 'PO-002',
                PO_Amount__c = 50000,
                Invoiced_Amount__c = 10000,
                Mobilization_Date__c = Date.today().addDays(-30),
                Last_Invoice_Date__c = Date.today().addDays(-5)
            ),
            new Project__c(
                Account__c = a.Id,
                Stage__c = 'Demob',
                PO_Number__c = null,
                PO_Amount__c = null,
                Mobilization_Date__c = null
            ),
            new Project__c(
                Account__c = a.Id,
                Stage__c = 'Closed',
                PO_Number__c = 'PO-004',
                PO_Amount__c = 25000,
                Invoiced_Amount__c = 25000,
                Mobilization_Date__c = Date.today().addDays(-60)
            )
        };
        insert projects;

        Id preMobId = projects[0].Id;
        insert new Task(
            Subject = 'Overdue gate task',
            WhatId = preMobId,
            Status = 'Not Started',
            ActivityDate = Date.today().addDays(-2),
            Is_Gate__c = true
        );
    }

    @isTest
    static void getDashboardData_returnsExpectedAggregates() {
        Test.startTest();
        HTSOpsDashboardController.DashboardData data =
            HTSOpsDashboardController.getDashboardData();
        Test.stopTest();

        System.assertNotEquals(null, data, 'Dashboard payload should not be null');
        System.assertEquals(3, data.stageCounts.size(), 'Should report three stages');

        Map<String, Integer> byStage = new Map<String, Integer>();
        for (HTSOpsDashboardController.StageCount sc : data.stageCounts) {
            byStage.put(sc.stage, sc.count);
        }
        System.assertEquals(1, byStage.get('Pre-Mob'));
        System.assertEquals(1, byStage.get('Executing'));
        System.assertEquals(1, byStage.get('Demob'));

        System.assertEquals(3, data.poBalances.size(), 'Closed should be excluded');
        System.assertEquals(1, data.missingPoData.size(), 'Demob row missing PO data');
        System.assert(data.overdueGates.size() >= 1, 'Should surface at least one overdue gate group');
        System.assertEquals(1, data.mobilizationCountdown.size(),
            'Only Pre-Mob projects with a mob date should appear in countdown');
    }
}
