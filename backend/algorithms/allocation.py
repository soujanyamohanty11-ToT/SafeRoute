def allocate_people(total_people, exits):
    remaining = total_people
    result = {}

    for exit_id, capacity in sorted(exits.items(), key=lambda x: x[1], reverse=True):
        assigned = min(remaining, capacity)
        result[exit_id] = {"capacity": capacity, "assigned": assigned}
        remaining -= assigned

    return result, remaining
