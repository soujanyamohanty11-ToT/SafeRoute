def allocate_people(total_people, exits):
    remaining = total_people
    result = {}

    for exit_id, capacity in exits.items():
        assigned = min(remaining, capacity)

        result[exit_id] = {
            "capacity": capacity,
            "assigned": assigned
        }

        remaining -= assigned

    return result, remaining