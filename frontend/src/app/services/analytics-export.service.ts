import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { EscrowContract, AuditTransaction } from '../models/escrow.models';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsExportService {
  /**
   * Export comprehensive PDF audit report for an escrow contract
   */
  exportContractPdf(contract: EscrowContract, ethPriceUsd: number) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor: [number, number, number] = [15, 23, 42]; // slate-900
    const accentColor: [number, number, number] = [16, 185, 129]; // emerald-500
    const mutedColor: [number, number, number] = [100, 116, 139]; // slate-500

    // Header Background
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 38, 'F');

    // Title & Logo
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SMART CONTRACT ESCROW AUDIT REPORT', 14, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...accentColor);
    doc.text(`NETWORK: ${contract.network.toUpperCase()}  |  EVM MULTI-SIG 2-OF-3`, 14, 26);

    doc.setTextColor(203, 213, 225);
    doc.text(`Generated on: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`, 14, 32);

    // Contract Meta Block
    let y = 48;
    doc.setTextColor(...primaryColor);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(contract.title, 14, y);

    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedColor);
    const splitDesc = doc.splitTextToSize(contract.description, 182);
    doc.text(splitDesc, 14, y);
    y += splitDesc.length * 4.5 + 4;

    // Key-Value Overview Table
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, y, 182, 38, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...mutedColor);
    doc.text('CONTRACT ADDRESS', 18, y + 8);
    doc.text('TOTAL ESCROW VALUE', 110, y + 8);

    doc.text('CLIENT (SIGNER 1)', 18, y + 20);
    doc.text('FREELANCER (SIGNER 2)', 110, y + 20);

    doc.text('STATUS & MULTI-SIG QUORUM', 18, y + 32);
    doc.text('ARBITER / MEDIATOR (SIGNER 3)', 110, y + 32);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...primaryColor);
    doc.text(contract.contractAddress, 18, y + 13);
    doc.text(`${contract.totalAmountEth} ETH (~$${(contract.totalAmountEth * ethPriceUsd).toLocaleString()})`, 110, y + 13);

    doc.text(`${contract.clientName} (${contract.clientAddress.slice(0, 10)}...)`, 18, y + 25);
    doc.text(`${contract.freelancerName} (${contract.freelancerAddress.slice(0, 10)}...)`, 110, y + 25);

    doc.text(`${contract.status.toUpperCase()} (${contract.requiredSignatures}-of-${contract.totalSigners} Threshold Met)`, 18, y + 37);
    doc.text(`${contract.arbiterName}`, 110, y + 37);

    y += 48;

    // Milestones Section Heading
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('MILESTONES & MULTI-SIG DISBURSEMENT SCHEDULE', 14, y);
    y += 6;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...mutedColor);
    doc.text('#', 17, y + 5.5);
    doc.text('Milestone Title', 26, y + 5.5);
    doc.text('Amount (ETH)', 90, y + 5.5);
    doc.text('Due Date', 118, y + 5.5);
    doc.text('Status', 145, y + 5.5);
    doc.text('Signatures', 172, y + 5.5);

    y += 8;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    contract.milestones.forEach((m, idx) => {
      const signedCount = m.signatures.filter((s) => s.signed).length;
      doc.setDrawColor(241, 245, 249);
      doc.line(14, y + 7, 196, y + 7);

      doc.setTextColor(...primaryColor);
      doc.text(`${idx + 1}`, 17, y + 5);
      doc.text(m.title.slice(0, 32), 26, y + 5);
      doc.text(`${m.amountEth} ETH`, 90, y + 5);
      doc.text(m.dueDate, 118, y + 5);

      if (m.status === 'released') {
        doc.setTextColor(16, 185, 129);
      } else if (m.status === 'disputed') {
        doc.setTextColor(239, 68, 68);
      } else if (m.status === 'submitted') {
        doc.setTextColor(245, 158, 11);
      } else {
        doc.setTextColor(...mutedColor);
      }
      doc.text(m.status.toUpperCase(), 145, y + 5);

      doc.setTextColor(...primaryColor);
      doc.text(`${signedCount}/${m.requiredSignatures} Signed`, 172, y + 5);
      y += 8;
    });

    y += 8;

    // Smart Contract Security & Verification Proofs
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('ON-CHAIN CRYPTOGRAPHIC PROOF & TERMS', 14, y);
    y += 6;

    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, 182, 28, 'F');
    doc.setFontSize(7.5);
    doc.setFont('courier', 'normal');
    doc.setTextColor(...primaryColor);
    doc.text(`Creation Tx Hash: ${contract.creationTxHash}`, 18, y + 6);
    doc.text(`IPFS Terms Hash:  ${contract.contractStateSnapshot.immutableIpfsTerms}`, 18, y + 12);
    doc.text(`EIP-712 Domain:   FreelanceEscrowMultiSig v1.0 (ChainId: 1)`, 18, y + 18);
    doc.text(`Dispute Resolver: Multi-Sig Decentralized Guild (Fee: ${contract.contractStateSnapshot.arbiterFeePercent}%)`, 18, y + 24);

    // Footer
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedColor);
    doc.text('This document serves as an immutable cryptographic audit record of the decentralized escrow agreement.', 14, 285);
    doc.text('Page 1 of 1', 185, 285);

    doc.save(`Escrow_Audit_${contract.id}_${Date.now()}.pdf`);
  }

  /**
   * Export all audit logs or contracts to CSV format
   */
  exportAuditLogsCsv(auditLogs: AuditTransaction[]) {
    const headers = ['ID', 'Timestamp (UTC)', 'Contract ID', 'Contract Title', 'Action', 'From Address', 'To Address', 'Value (ETH)', 'Gas Used (Gwei)', 'Block Number', 'Tx Hash'];
    const rows = auditLogs.map((log) => [
      log.id,
      `"${log.timestamp}"`,
      log.contractId,
      `"${log.contractTitle.replace(/"/g, '""')}"`,
      `"${log.action.replace(/"/g, '""')}"`,
      log.fromAddress,
      log.toAddress,
      log.valueEth,
      log.gasUsedGwei,
      log.blockNumber,
      log.txHash,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadBlob(csvContent, `Escrow_Audit_Transactions_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  }

  /**
   * Export contracts summary to CSV
   */
  exportContractsCsv(contracts: EscrowContract[]) {
    const headers = ['Contract ID', 'Title', 'Category', 'Network', 'Status', 'Total (ETH)', 'Released (ETH)', 'Locked (ETH)', 'Client', 'Freelancer', 'Contract Address', 'Creation Date'];
    const rows = contracts.map((c) => [
      c.id,
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.category}"`,
      `"${c.network}"`,
      c.status,
      c.totalAmountEth,
      c.releasedAmountEth,
      c.lockedAmountEth,
      `"${c.clientName}"`,
      `"${c.freelancerName}"`,
      c.contractAddress,
      c.createdAt,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    this.downloadBlob(csvContent, `Freelance_Escrow_Contracts_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  }

  private downloadBlob(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
