import { LightningElement, wire } from 'lwc';
import getDashboardData from '@salesforce/apex/HTSOpsDashboardController.getDashboardData';

export default class HtsOpsDashboard extends LightningElement {
    data;
    error;

    @wire(getDashboardData)
    wiredData({ data, error }) {
        if (data) {
            this.data = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.data = undefined;
        }
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
            badgeClass: this.bandClass(row.colorBand),
            percentDisplay:
                row.percentRemaining == null
                    ? '—'
                    : `${Number(row.percentRemaining).toFixed(1)}%`
        }));
    }

    get overdueGates() {
        return this.data ? this.data.overdueGates : [];
    }

    get overdueCount() {
        if (!this.data) return 0;
        return this.data.overdueGates.reduce(
            (sum, g) => sum + (g.tasks ? g.tasks.length : 0),
            0
        );
    }

    get invoiceAging() {
        return this.data ? this.data.invoiceAging : [];
    }

    get mobilizationCountdown() {
        return this.data ? this.data.mobilizationCountdown : [];
    }

    get missingPoData() {
        return this.data ? this.data.missingPoData : [];
    }

    get missingPoCount() {
        return this.data ? this.data.missingPoData.length : 0;
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
