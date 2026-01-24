using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace Backend.Models;

public partial class AppDbContext : DbContext
{
    public AppDbContext()
    {
    }

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Action> Actions { get; set; }

    public virtual DbSet<Batch> Batches { get; set; }

    public virtual DbSet<ChangeLog> ChangeLogs { get; set; }

    public virtual DbSet<Consumption> Consumptions { get; set; }

    public virtual DbSet<Contract> Contracts { get; set; }

    public virtual DbSet<Customer> Customers { get; set; }

    public virtual DbSet<Document> Documents { get; set; }

    public virtual DbSet<InventoryMovement> InventoryMovements { get; set; }

    public virtual DbSet<Invoice> Invoices { get; set; }

    public virtual DbSet<LabAnalysis> LabAnalyses { get; set; }

    public virtual DbSet<Material> Materials { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<Order> Orders { get; set; }

    public virtual DbSet<OrderItem> OrderItems { get; set; }

    public virtual DbSet<Payment> Payments { get; set; }

    public virtual DbSet<PrismaMigration> PrismaMigrations { get; set; }

    public virtual DbSet<ProductType> ProductTypes { get; set; }

    public virtual DbSet<Purchase> Purchases { get; set; }

    public virtual DbSet<Shipment> Shipments { get; set; }

    public virtual DbSet<StockItem> StockItems { get; set; }

    public virtual DbSet<Supplier> Suppliers { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<Warehouse> Warehouses { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see https://go.microsoft.com/fwlink/?LinkId=723263.
        => optionsBuilder.UseNpgsql("Host=192.168.1.24;Database=diplom;Username=postgres;Password=123123z123Z;Port=5432");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasPostgresEnum("BatchStatus", new[] { "DRAFT", "QUARANTINE", "CERTIFIED", "ACTIVE", "SHIPPED", "SCRAPPED" })
            .HasPostgresEnum("DeliveryType", new[] { "EXPRESS", "STANDARD" })
            .HasPostgresEnum("InvoiceStatus", new[] { "DRAFT", "ISSUED", "PAID", "OVERDUE", "CANCELLED" })
            .HasPostgresEnum("MaterialType", new[] { "RAW_MATERIAL", "PACKAGING", "LABEL", "AUXILIARY" })
            .HasPostgresEnum("MovementType", new[] { "RECEIPT", "ISSUE", "RESERVE", "WRITE_OFF", "TRANSFER", "CONSUMPTION" })
            .HasPostgresEnum("NotificationType", new[] { "LOW_STOCK", "EXPIRING_CERT", "OVERDUE_CONTRACT", "SHIPMENT_DELAY" })
            .HasPostgresEnum("OrderStatus", new[] { "NEW", "IN_PRODUCTION", "PACKED", "READY_FOR_SHIPMENT", "SHIPPED", "DELIVERED", "CANCELLED" })
            .HasPostgresEnum("PaymentStatus", new[] { "PENDING", "PAID", "PARTIAL", "REFUNDED" })
            .HasPostgresEnum("Role", new[] { "ADMIN", "LOGIST", "WAREHOUSE_WORKER", "MANAGER", "ACCOUNTANT", "CLIENT" })
            .HasPostgresEnum("ShipmentStatus", new[] { "PENDING", "IN_TRANSIT", "DELAYED", "DELIVERED", "FAILED" });

        modelBuilder.Entity<Action>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("actions_pkey");

            entity.ToTable("actions");

            entity.HasIndex(e => e.EntityType, "actions_entityType_idx");

            entity.HasIndex(e => e.Timestamp, "actions_timestamp_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Action1).HasColumnName("action");
            entity.Property(e => e.Details)
                .HasColumnType("jsonb")
                .HasColumnName("details");
            entity.Property(e => e.EntityId).HasColumnName("entityId");
            entity.Property(e => e.EntityType).HasColumnName("entityType");
            entity.Property(e => e.Timestamp)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("timestamp");
            entity.Property(e => e.UserId).HasColumnName("userId");

            entity.HasOne(d => d.User).WithMany(p => p.Actions)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("actions_userId_fkey");
        });

        modelBuilder.Entity<Batch>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("batches_pkey");

            entity.ToTable("batches");

            entity.HasIndex(e => e.BatchNumber, "batches_batchNumber_idx");

            entity.HasIndex(e => e.BatchNumber, "batches_batchNumber_key").IsUnique();

            entity.HasIndex(e => e.ExpiryDate, "batches_expiryDate_idx");

            entity.HasIndex(e => e.Parameters, "batches_parameters_idx");

            entity.HasIndex(e => e.Status, "batches_status_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Barcode).HasColumnName("barcode");
            entity.Property(e => e.BatchNumber).HasColumnName("batchNumber");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.ExpiryDate)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("expiryDate");
            entity.Property(e => e.ExportMarking).HasColumnName("exportMarking");
            entity.Property(e => e.MinStock)
                .HasDefaultValueSql("0")
                .HasColumnName("minStock");
            entity.Property(e => e.PackagingType).HasColumnName("packagingType");
            entity.Property(e => e.Parameters)
                .HasColumnType("jsonb")
                .HasColumnName("parameters");
            entity.Property(e => e.ProductTypeId).HasColumnName("productTypeId");
            entity.Property(e => e.ProductionDate)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("productionDate");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'ACTIVE'::text")
                .HasColumnName("status");
            entity.Property(e => e.Unit).HasColumnName("unit");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");

            entity.HasOne(d => d.ProductType).WithMany(p => p.Batches)
                .HasForeignKey(d => d.ProductTypeId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("batches_productTypeId_fkey");
        });

        modelBuilder.Entity<ChangeLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("change_logs_pkey");

            entity.ToTable("change_logs");

            entity.HasIndex(e => e.Timestamp, "change_logs_timestamp_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Action).HasColumnName("action");
            entity.Property(e => e.BatchId).HasColumnName("batchId");
            entity.Property(e => e.NewValue)
                .HasColumnType("jsonb")
                .HasColumnName("newValue");
            entity.Property(e => e.OldValue)
                .HasColumnType("jsonb")
                .HasColumnName("oldValue");
            entity.Property(e => e.Timestamp)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("timestamp");
            entity.Property(e => e.UserId).HasColumnName("userId");

            entity.HasOne(d => d.Batch).WithMany(p => p.ChangeLogs)
                .HasForeignKey(d => d.BatchId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("change_logs_batchId_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.ChangeLogs)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("change_logs_userId_fkey");
        });

        modelBuilder.Entity<Consumption>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("consumptions_pkey");

            entity.ToTable("consumptions");

            entity.HasIndex(e => new { e.BatchId, e.MaterialId }, "consumptions_batchId_materialId_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BatchId).HasColumnName("batchId");
            entity.Property(e => e.Date)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("date");
            entity.Property(e => e.MaterialId).HasColumnName("materialId");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.Quantity).HasColumnName("quantity");

            entity.HasOne(d => d.Batch).WithMany(p => p.Consumptions)
                .HasForeignKey(d => d.BatchId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("consumptions_batchId_fkey");

            entity.HasOne(d => d.Material).WithMany(p => p.Consumptions)
                .HasForeignKey(d => d.MaterialId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("consumptions_materialId_fkey");
        });

        modelBuilder.Entity<Contract>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("contracts_pkey");

            entity.ToTable("contracts");

            entity.HasIndex(e => e.EndDate, "contracts_endDate_idx");

            entity.HasIndex(e => e.Number, "contracts_number_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CustomerId).HasColumnName("customerId");
            entity.Property(e => e.EndDate)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("endDate");
            entity.Property(e => e.Number).HasColumnName("number");
            entity.Property(e => e.StartDate)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("startDate");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'ACTIVE'::text")
                .HasColumnName("status");
            entity.Property(e => e.Value).HasColumnName("value");

            entity.HasOne(d => d.Customer).WithMany(p => p.Contracts)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("contracts_customerId_fkey");
        });

        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("customers_pkey");

            entity.ToTable("customers");

            entity.HasIndex(e => e.UserId, "customers_userId_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Address).HasColumnName("address");
            entity.Property(e => e.Country).HasColumnName("country");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Phone).HasColumnName("phone");
            entity.Property(e => e.Region).HasColumnName("region");
            entity.Property(e => e.TaxId).HasColumnName("taxId");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");
            entity.Property(e => e.UserId).HasColumnName("userId");

            entity.HasOne(d => d.User).WithOne(p => p.Customer)
                .HasForeignKey<Customer>(d => d.UserId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("customers_userId_fkey");
        });

        modelBuilder.Entity<Document>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("documents_pkey");

            entity.ToTable("documents");

            entity.HasIndex(e => e.ExpiryDate, "documents_expiryDate_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BatchId).HasColumnName("batchId");
            entity.Property(e => e.ExpiryDate)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("expiryDate");
            entity.Property(e => e.FilePath).HasColumnName("filePath");
            entity.Property(e => e.IssuedDate)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("issuedDate");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.Version).HasColumnName("version");

            entity.HasOne(d => d.Batch).WithMany(p => p.Documents)
                .HasForeignKey(d => d.BatchId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("documents_batchId_fkey");
        });

        modelBuilder.Entity<InventoryMovement>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("inventory_movements_pkey");

            entity.ToTable("inventory_movements");

            entity.HasIndex(e => e.Date, "inventory_movements_date_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BatchId).HasColumnName("batchId");
            entity.Property(e => e.Date)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("date");
            entity.Property(e => e.FromWarehouseId).HasColumnName("fromWarehouseId");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.Reason).HasColumnName("reason");
            entity.Property(e => e.ToWarehouseId).HasColumnName("toWarehouseId");
            entity.Property(e => e.Type).HasColumnName("type");
            entity.Property(e => e.UserId).HasColumnName("userId");

            entity.HasOne(d => d.Batch).WithMany(p => p.InventoryMovements)
                .HasForeignKey(d => d.BatchId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("inventory_movements_batchId_fkey");

            entity.HasOne(d => d.FromWarehouse).WithMany(p => p.InventoryMovementFromWarehouses)
                .HasForeignKey(d => d.FromWarehouseId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("inventory_movements_fromWarehouseId_fkey");

            entity.HasOne(d => d.ToWarehouse).WithMany(p => p.InventoryMovementToWarehouses)
                .HasForeignKey(d => d.ToWarehouseId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("inventory_movements_toWarehouseId_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.InventoryMovements)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("inventory_movements_userId_fkey");
        });

        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("invoices_pkey");

            entity.ToTable("invoices");

            entity.HasIndex(e => e.DueDate, "invoices_dueDate_idx");

            entity.HasIndex(e => e.Number, "invoices_number_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Amount).HasColumnName("amount");
            entity.Property(e => e.Currency)
                .HasDefaultValueSql("'RUB'::text")
                .HasColumnName("currency");
            entity.Property(e => e.CustomerId).HasColumnName("customerId");
            entity.Property(e => e.DueDate)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("dueDate");
            entity.Property(e => e.IssueDate)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("issueDate");
            entity.Property(e => e.Number).HasColumnName("number");
            entity.Property(e => e.OrderId).HasColumnName("orderId");

            entity.HasOne(d => d.Customer).WithMany(p => p.Invoices)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("invoices_customerId_fkey");

            entity.HasOne(d => d.Order).WithMany(p => p.Invoices)
                .HasForeignKey(d => d.OrderId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("invoices_orderId_fkey");
        });

        modelBuilder.Entity<LabAnalysis>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("lab_analyses_pkey");

            entity.ToTable("lab_analyses");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Approved)
                .HasDefaultValue(false)
                .HasColumnName("approved");
            entity.Property(e => e.BatchId).HasColumnName("batchId");
            entity.Property(e => e.Date)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("date");
            entity.Property(e => e.LabNotes).HasColumnName("labNotes");
            entity.Property(e => e.Parameters)
                .HasColumnType("jsonb")
                .HasColumnName("parameters");

            entity.HasOne(d => d.Batch).WithMany(p => p.LabAnalyses)
                .HasForeignKey(d => d.BatchId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("lab_analyses_batchId_fkey");
        });

        modelBuilder.Entity<Material>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("materials_pkey");

            entity.ToTable("materials");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.MinStock).HasColumnName("minStock");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Unit).HasColumnName("unit");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("notifications_pkey");

            entity.ToTable("notifications");

            entity.HasIndex(e => e.CreatedAt, "notifications_createdAt_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.IsRead)
                .HasDefaultValue(false)
                .HasColumnName("isRead");
            entity.Property(e => e.Message).HasColumnName("message");
            entity.Property(e => e.RelatedId).HasColumnName("relatedId");
            entity.Property(e => e.UserId).HasColumnName("userId");

            entity.HasOne(d => d.User).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("notifications_userId_fkey");
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("orders_pkey");

            entity.ToTable("orders");

            entity.HasIndex(e => e.OrderNumber, "orders_orderNumber_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.Currency)
                .HasDefaultValueSql("'RUB'::text")
                .HasColumnName("currency");
            entity.Property(e => e.CustomerId).HasColumnName("customerId");
            entity.Property(e => e.ExpectedDelivery)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("expectedDelivery");
            entity.Property(e => e.OrderNumber).HasColumnName("orderNumber");
            entity.Property(e => e.PackingNotes).HasColumnName("packingNotes");
            entity.Property(e => e.ProductionNotes).HasColumnName("productionNotes");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'NEW'::\"OrderStatus\"")
                .HasColumnName("status");
            entity.Property(e => e.TotalAmount).HasColumnName("totalAmount");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");
            entity.Property(e => e.UserId).HasColumnName("userId");

            entity.HasOne(d => d.Customer).WithMany(p => p.Orders)
                .HasForeignKey(d => d.CustomerId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("orders_customerId_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.Orders)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("orders_userId_fkey");
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("order_items_pkey");

            entity.ToTable("order_items");

            entity.HasIndex(e => new { e.OrderId, e.BatchId }, "order_items_orderId_batchId_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BatchId).HasColumnName("batchId");
            entity.Property(e => e.OrderId).HasColumnName("orderId");
            entity.Property(e => e.Price).HasColumnName("price");
            entity.Property(e => e.Quantity).HasColumnName("quantity");

            entity.HasOne(d => d.Batch).WithMany(p => p.OrderItems)
                .HasForeignKey(d => d.BatchId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("order_items_batchId_fkey");

            entity.HasOne(d => d.Order).WithMany(p => p.OrderItems)
                .HasForeignKey(d => d.OrderId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("order_items_orderId_fkey");
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("payments_pkey");

            entity.ToTable("payments");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Amount).HasColumnName("amount");
            entity.Property(e => e.Date)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("date");
            entity.Property(e => e.InvoiceId).HasColumnName("invoiceId");
            entity.Property(e => e.Method).HasColumnName("method");

            entity.HasOne(d => d.Invoice).WithMany(p => p.Payments)
                .HasForeignKey(d => d.InvoiceId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("payments_invoiceId_fkey");
        });

        modelBuilder.Entity<PrismaMigration>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("_prisma_migrations_pkey");

            entity.ToTable("_prisma_migrations");

            entity.Property(e => e.Id)
                .HasMaxLength(36)
                .HasColumnName("id");
            entity.Property(e => e.AppliedStepsCount)
                .HasDefaultValue(0)
                .HasColumnName("applied_steps_count");
            entity.Property(e => e.Checksum)
                .HasMaxLength(64)
                .HasColumnName("checksum");
            entity.Property(e => e.FinishedAt).HasColumnName("finished_at");
            entity.Property(e => e.Logs).HasColumnName("logs");
            entity.Property(e => e.MigrationName)
                .HasMaxLength(255)
                .HasColumnName("migration_name");
            entity.Property(e => e.RolledBackAt).HasColumnName("rolled_back_at");
            entity.Property(e => e.StartedAt)
                .HasDefaultValueSql("now()")
                .HasColumnName("started_at");
        });

        modelBuilder.Entity<ProductType>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("product_types_pkey");

            entity.ToTable("product_types");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Category).HasColumnName("category");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Unit).HasColumnName("unit");
        });

        modelBuilder.Entity<Purchase>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("purchases_pkey");

            entity.ToTable("purchases");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BatchId).HasColumnName("batchId");
            entity.Property(e => e.Cost).HasColumnName("cost");
            entity.Property(e => e.Date)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("date");
            entity.Property(e => e.InvoiceRef).HasColumnName("invoiceRef");
            entity.Property(e => e.MaterialId).HasColumnName("materialId");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.SupplierId).HasColumnName("supplierId");
            entity.Property(e => e.Type).HasColumnName("type");

            entity.HasOne(d => d.Batch).WithMany(p => p.Purchases)
                .HasForeignKey(d => d.BatchId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("purchases_batchId_fkey");

            entity.HasOne(d => d.Material).WithMany(p => p.Purchases)
                .HasForeignKey(d => d.MaterialId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("purchases_materialId_fkey");

            entity.HasOne(d => d.Supplier).WithMany(p => p.Purchases)
                .HasForeignKey(d => d.SupplierId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("purchases_supplierId_fkey");
        });

        modelBuilder.Entity<Shipment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("shipments_pkey");

            entity.ToTable("shipments");

            entity.HasIndex(e => e.EstimatedDate, "shipments_estimatedDate_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ActualDate)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("actualDate");
            entity.Property(e => e.Carrier).HasColumnName("carrier");
            entity.Property(e => e.Cost).HasColumnName("cost");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.EstimatedDate)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("estimatedDate");
            entity.Property(e => e.FromWarehouseId).HasColumnName("fromWarehouseId");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.OrderId).HasColumnName("orderId");
            entity.Property(e => e.TrackingNumber).HasColumnName("trackingNumber");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");

            entity.HasOne(d => d.FromWarehouse).WithMany(p => p.Shipments)
                .HasForeignKey(d => d.FromWarehouseId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("shipments_fromWarehouseId_fkey");

            entity.HasOne(d => d.Order).WithMany(p => p.Shipments)
                .HasForeignKey(d => d.OrderId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("shipments_orderId_fkey");
        });

        modelBuilder.Entity<StockItem>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("stock_items_pkey");

            entity.ToTable("stock_items");

            entity.HasIndex(e => new { e.BatchId, e.WarehouseId }, "stock_items_batchId_warehouseId_key").IsUnique();

            entity.HasIndex(e => e.Quantity, "stock_items_quantity_idx");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BatchId).HasColumnName("batchId");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.Reserved).HasColumnName("reserved");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");
            entity.Property(e => e.WarehouseId).HasColumnName("warehouseId");

            entity.HasOne(d => d.Batch).WithMany(p => p.StockItems)
                .HasForeignKey(d => d.BatchId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("stock_items_batchId_fkey");

            entity.HasOne(d => d.Warehouse).WithMany(p => p.StockItems)
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("stock_items_warehouseId_fkey");
        });

        modelBuilder.Entity<Supplier>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("suppliers_pkey");

            entity.ToTable("suppliers");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Country).HasColumnName("country");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Phone).HasColumnName("phone");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("users_pkey");

            entity.ToTable("users");

            entity.HasIndex(e => e.Email, "users_email_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("createdAt");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.PasswordHash).HasColumnName("passwordHash");
            entity.Property(e => e.PreferredLanguage)
                .HasDefaultValueSql("'RU'::text")
                .HasColumnName("preferredLanguage");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updatedAt");
        });

        modelBuilder.Entity<Warehouse>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("warehouses_pkey");

            entity.ToTable("warehouses");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Capacity).HasColumnName("capacity");
            entity.Property(e => e.Location).HasColumnName("location");
            entity.Property(e => e.Name).HasColumnName("name");
            entity.Property(e => e.Type)
                .HasDefaultValueSql("'MAIN'::text")
                .HasColumnName("type");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
