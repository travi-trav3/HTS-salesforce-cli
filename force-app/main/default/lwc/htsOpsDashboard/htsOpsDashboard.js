import { LightningElement, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getDashboardData from '@salesforce/apex/HTSOpsDashboardController.getDashboardData';

export default class HtsOpsDashboard extends NavigationMixin(LightningElement) {
    data;
    error;
    urlMap = {};

    @wire(getDashboardData)
    wiredData({ data, error }) {
        if (data) {
            this.data = data;
            this.error = undefined;
            this.generateRecordUrls();
        } else if (error) {
            this.error = error;
            this.data = undefined;
        }
    }

    // Pre-generate Lightning record URLs for every Work Order referenced on the
    // dashboard so the names render as in-app navigable links (no page reload).
    generateRecordUrls() {
        const ids = new Set();
        const collect = (rows) => {
            if (rows) {
                rows.forEach((r) => {
                    if (r && r.workOrderId) {
                        ids.add(r.workOrderId);
                    }
                });
            }
        };
        collect(this.data.poBalances);
        collect(this.data.invoiceAging);
        collect(this.data.mobilizationCountdown);
        collect(this.data.missingPoData);
        collect(this.data.overdueGates);
        collect(this.data.recentActivity);

        ids.forEach((id) => {
            this[NavigationMixin.GenerateUrl]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: id,
                    objectApiName: 'Project__c',
                    actionName: 'view'
                }
            }).then((url) => {
                // Reassign to trigger reactivity so getters pick up the URL.
                this.urlMap = { ...this.urlMap, [id]: url };
            });
        });
    }

    handleNavigate(event) {
        event.preventDefault();
        const recordId = event.currentTarget.dataset.id;
        if (!recordId) {
            return;
        }
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId,
                objectApiName: 'Project__c',
                actionName: 'view'
            }
        });
    }

    get hasData() {
        return !!this.data;
    }

    get stageCounts() {
        return this.data ? this.data.stageCounts : [];
    }

    get poBalances() {
        if (!this.data) return [];
        return this.data.poBalances.map((row) => ({
            ...row,
            recordUrl: this.urlMap[row.workOrderId],
            badgeClass: this.bandClass(row.colorBand),
            percentDisplay:
                row.percentRemaining == null
                    ? '—'
                    : `${Number(row.percentRemaining).toFixed(1)}%`
        }));
    }

    get overdueGates() {
        if (!this.data) return [];
        return this.data.overdueGates.map((group) => ({
            ...group,
            recordUrl: this.urlMap[group.workOrderId]
        }));
    }

    get overdueCount() {
        if (!this.data) return 0;
        return this.data.overdueGates.reduce(
            (sum, g) => sum + (g.tasks ? g.tasks.length : 0),
            0
        );
    }

    get invoiceAging() {
        if (!this.data) return [];
        return this.data.invoiceAging.map((row) => ({
            ...row,
            recordUrl: this.urlMap[row.workOrderId]
        }));
    }

    get mobilizationCountdown() {
        if (!this.data) return [];
        return this.data.mobilizationCountdown.map((row) => ({
            ...row,
            recordUrl: this.urlMap[row.workOrderId]
        }));
    }

    get missingPoData() {
        if (!this.data) return [];
        return this.data.missingPoData.map((row) => ({
            ...row,
            recordUrl: this.urlMap[row.workOrderId]
        }));
    }

    get missingPoCount() {
        return this.data ? this.data.missingPoData.length : 0;
    }

    get recentActivity() {
        if (!this.data || !this.data.recentActivity) return [];
        return this.data.recentActivity.map((row) => ({
            ...row,
            recordUrl: this.urlMap[row.workOrderId]
        }));
    }

    bandClass(band) {
        switch (band) {
            case 'red':
                return 'slds-badge slds-theme_error';
            case 'yellow':
                return 'slds-badge slds-theme_warning';
            case 'green':
                return 'slds-badge slds-theme_success';
            default:
                return 'slds-badge';
        }
    }
}
