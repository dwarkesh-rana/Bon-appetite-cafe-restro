import { db, TableRecord } from './db';
import { logger } from './logger';

interface AllocationResult {
  success: boolean;
  tableNumber: string | null;
  message: string;
}

/**
 * Advanced Table Allocation Algorithm:
 * Evaluates all subsets of tables (including single tables) to find the combination
 * that accommodates the guests with the absolute minimum unused seats.
 * As a tie-breaker, it prefers the option that uses the fewest physical tables.
 */
export async function allocateTable(
  date: string,
  timeSlot: string,
  guests: number
): Promise<AllocationResult> {
  try {
    // 1. Fetch all reservations for the target date
    const allReservations = await db.getReservations(date);
    
    // Filter active reservations in the target time slot
    const activeReservations = allReservations.filter(
      r => r.reservation_time === timeSlot && (r.status === 'confirmed' || r.status === 'pending')
    );

    // 2. Map out occupied tables
    const occupiedTableNames = new Set<string>();
    activeReservations.forEach(r => {
      if (r.table_number) {
        r.table_number.split(',').forEach(name => occupiedTableNames.add(name.trim()));
      }
    });

    // 3. Fetch all tables configuration
    const allTables = await db.getTables();
    
    // Filter to active/available tables in the system that are NOT occupied in this slot
    const availableTables = allTables.filter(
      t => t.available && !occupiedTableNames.has(t.table_name)
    );

    if (availableTables.length === 0) {
      return {
        success: false,
        tableNumber: null,
        message: 'No tables are physically available in this slot.',
      };
    }

    // 4. Find the absolute best combination of tables (including single tables)
    // We want to minimize (totalCapacity - guests), then minimize (number of tables)
    const bestCombination = findOptimalTableSet(availableTables, guests);

    if (bestCombination.length > 0) {
      const tableNames = bestCombination.map(t => t.table_name).join(', ');
      const totalCapacity = bestCombination.reduce((sum, t) => sum + t.capacity, 0);
      const unusedSeats = totalCapacity - guests;

      logger.info(`[Allocator] Allocated: ${tableNames} for ${guests} guests. Total capacity: ${totalCapacity}. Unused seats: ${unusedSeats}`);
      
      return {
        success: true,
        tableNumber: tableNames,
        message: `Allocated: ${tableNames} (Capacity: ${totalCapacity}, Unused: ${unusedSeats})`,
      };
    }

    return {
      success: false,
      tableNumber: null,
      message: 'No tables or combination of tables can accommodate your party size.',
    };
  } catch (error: any) {
    logger.error('[Allocator] Error allocating table:', error);
    return {
      success: false,
      tableNumber: null,
      message: error.message || 'Error occurred during table allocation.',
    };
  }
}

/**
 * Explores all combinations of tables and finds the optimal subset that:
 * 1. Has total capacity >= guests.
 * 2. Minimizes total capacity (minimizes unused seats).
 * 3. Minimizes the number of tables combined (tie-breaker).
 */
function findOptimalTableSet(tables: TableRecord[], guests: number): TableRecord[] {
  let optimalSet: TableRecord[] = [];
  let minCapacity = Infinity;
  let minTableCount = Infinity;

  const backtrack = (index: number, currentSet: TableRecord[], currentCapacity: number) => {
    // If we can accommodate the guests
    if (currentCapacity >= guests) {
      const currentTableCount = currentSet.length;
      
      // We want to minimize capacity first.
      // If capacity is equal, we minimize the number of tables used.
      if (
        currentCapacity < minCapacity ||
        (currentCapacity === minCapacity && currentTableCount < minTableCount)
      ) {
        optimalSet = [...currentSet];
        minCapacity = currentCapacity;
        minTableCount = currentTableCount;
      }
      return;
    }

    if (index >= tables.length) return;

    // Option 1: Include tables[index]
    backtrack(index + 1, [...currentSet, tables[index]], currentCapacity + tables[index].capacity);

    // Option 2: Exclude tables[index]
    backtrack(index + 1, currentSet, currentCapacity);
  };

  backtrack(0, [], 0);

  return optimalSet;
}
