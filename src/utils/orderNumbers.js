export function toPublicOrderNumber(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function ensurePublicOrderNumbers(orderList = []) {
  if (!Array.isArray(orderList)) {
    return [];
  }

  const uniqueNumbers = new Set();
  let maxNumber = 0;
  const needsAssignment = orderList.map(order => {
    const parsed = toPublicOrderNumber(order?.publicOrderNumber);
    if (parsed && !uniqueNumbers.has(parsed)) {
      uniqueNumbers.add(parsed);
      if (parsed > maxNumber) {
        maxNumber = parsed;
      }
      return false;
    }
    return true;
  });

  if (!needsAssignment.includes(true)) {
    return orderList;
  }

  const result = orderList.map((order, index) => {
    if (!needsAssignment[index]) {
      return order;
    }

    let nextNumber = maxNumber + 1;
    while (uniqueNumbers.has(nextNumber)) {
      nextNumber += 1;
    }
    uniqueNumbers.add(nextNumber);
    maxNumber = nextNumber;
    return { ...order, publicOrderNumber: nextNumber };
  });

  return result;
}

export function getNextPublicOrderNumber(orderList = []) {
  if (!Array.isArray(orderList) || orderList.length === 0) {
    return 1;
  }
  let maxNumber = 0;
  for (const order of orderList) {
    const parsed = toPublicOrderNumber(order?.publicOrderNumber);
    if (parsed && parsed > maxNumber) {
      maxNumber = parsed;
    }
  }
  return maxNumber + 1;
}



