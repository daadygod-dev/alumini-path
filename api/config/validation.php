<?php
/*
 * Alumini-Path :: validation helpers
 *
 * Each function checks one thing and adds a message to the $errors array
 * when the value is not acceptable.
 */

/*
 * Checks that a field has a value.
 */
function check_required($input, $field, $label, &$errors)
{
    $value = input_value($input, $field, '');

    if ($value === '' || $value === null) {
        $errors[$field][] = $label . ' is required.';
    }
}

/*
 * Checks that a field looks like an email address.
 */
function check_email($input, $field, $label, &$errors)
{
    $value = input_value($input, $field, '');

    if ($value === '' || $value === null) {
        return;
    }

    if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
        $errors[$field][] = $label . ' must be a valid email address.';
    }
}

/*
 * Checks that a field holds phone characters (digits, +, -, spaces, brackets).
 */
function check_numeric_text($input, $field, $label, &$errors)
{
    $value = input_value($input, $field, '');

    if ($value === '' || $value === null) {
        return;
    }

    $length = strlen($value);

    if ($length < 7 || $length > 20) {
        $errors[$field][] = $label . ' must be 7 to 20 characters.';
        return;
    }

    $allowed = '0123456789+- ()';

    for ($i = 0; $i < $length; $i++) {
        if (strpos($allowed, $value[$i]) === false) {
            $errors[$field][] = $label . ' must contain digits only.';
            return;
        }
    }
}

/*
 * Checks that a field is a whole number inside a range.
 */
function check_number($input, $field, $label, $minimum, $maximum, &$errors)
{
    $value = input_value($input, $field, '');

    if ($value === '' || $value === null) {
        return;
    }

    if (!is_numeric($value) || (string) (int) $value !== (string) $value) {
        $errors[$field][] = $label . ' must be a whole number.';
        return;
    }

    $number = (int) $value;

    if ($number < $minimum) {
        $errors[$field][] = $label . ' must be ' . $minimum . ' or greater.';
    }

    if ($number > $maximum) {
        $errors[$field][] = $label . ' must be ' . $maximum . ' or less.';
    }
}

/*
 * Checks that a field is a graduation style year.
 */
function check_year($input, $field, $label, &$errors)
{
    $maximum = (int) date('Y') + 12;
    check_number($input, $field, $label, 1950, $maximum, $errors);
}

/*
 * Checks that a field is a real date in YYYY-MM-DD format.
 */
function check_date($input, $field, $label, &$errors)
{
    $value = input_value($input, $field, '');

    if ($value === '' || $value === null) {
        return;
    }

    $parts = explode('-', $value);

    if (count($parts) !== 3) {
        $errors[$field][] = $label . ' must be a valid date in YYYY-MM-DD format.';
        return;
    }

    if (!ctype_digit($parts[0]) || !ctype_digit($parts[1]) || !ctype_digit($parts[2])) {
        $errors[$field][] = $label . ' must be a valid date in YYYY-MM-DD format.';
        return;
    }

    if (!checkdate((int) $parts[1], (int) $parts[2], (int) $parts[0])) {
        $errors[$field][] = $label . ' must be a real calendar date.';
    }
}

/*
 * Checks that a field is a time in HH:MM or HH:MM:SS format.
 */
function check_time($input, $field, $label, &$errors)
{
    $value = input_value($input, $field, '');

    if ($value === '' || $value === null) {
        return;
    }

    $parts = explode(':', $value);

    if (count($parts) !== 2 && count($parts) !== 3) {
        $errors[$field][] = $label . ' must be a valid time in HH:MM format.';
        return;
    }

    foreach ($parts as $part) {
        if (strlen($part) !== 2 || !ctype_digit($part)) {
            $errors[$field][] = $label . ' must be a valid time in HH:MM format.';
            return;
        }
    }

    $hour = (int) $parts[0];
    $minute = (int) $parts[1];
    $second = isset($parts[2]) ? (int) $parts[2] : 0;

    if ($hour < 0 || $hour > 23 || $minute < 0 || $minute > 59 || $second < 0 || $second > 59) {
        $errors[$field][] = $label . ' must be a valid time in HH:MM format.';
    }
}

/*
 * Checks password strength: 8 characters minimum and at least three of
 * lowercase, uppercase, number, symbol.
 */
function check_password($input, $field, $label, &$errors)
{
    $value = input_value($input, $field, '');

    if ($value === '' || $value === null) {
        $errors[$field][] = $label . ' is required.';
        return;
    }

    $length = strlen($value);

    if ($length < 8) {
        $errors[$field][] = $label . ' must be at least 8 characters.';
        return;
    }

    $has_lower = 0;
    $has_upper = 0;
    $has_digit = 0;
    $has_symbol = 0;

    for ($i = 0; $i < $length; $i++) {
        $ch = $value[$i];

        if (ctype_lower($ch)) {
            $has_lower = 1;
        } elseif (ctype_upper($ch)) {
            $has_upper = 1;
        } elseif (ctype_digit($ch)) {
            $has_digit = 1;
        } else {
            $has_symbol = 1;
        }
    }

    $kinds = $has_lower + $has_upper + $has_digit + $has_symbol;

    if ($kinds < 3) {
        $errors[$field][] = $label . ' must use at least three of: lowercase, uppercase, number, symbol.';
    }
}

/*
 * Checks that a field holds one of the allowed values.
 */
function check_choice($input, $field, $label, $allowed, &$errors)
{
    $value = input_value($input, $field, '');

    if ($value === '' || $value === null) {
        return;
    }

    if (!in_array($value, $allowed, true)) {
        $errors[$field][] = $label . ' must be one of: ' . implode(', ', $allowed) . '.';
    }
}

/*
 * Checks that a date is not earlier than the given day.
 */
function check_not_before($input, $field, $earliest, $label, &$errors)
{
    $value = input_value($input, $field, '');

    if ($value === '' || $value === null) {
        return;
    }

    if ($value < $earliest) {
        $errors[$field][] = $label . ' must be on or after ' . $earliest . '.';
    }
}

/*
 * Checks the length of a free text field.
 */
function check_text_length($input, $field, $label, $max_length, &$errors)
{
    $value = input_value($input, $field, '');

    if ($value === '' || $value === null) {
        return;
    }

    if (strlen($value) > $max_length) {
        $errors[$field][] = $label . ' must not be longer than ' . $max_length . ' characters.';
    }
}

/*
 * Sends the collected errors and stops if there are any.
 */
function stop_if_errors($errors, $message = 'Please fix the highlighted fields.')
{
    if (count($errors) > 0) {
        reply_error($message, 422, $errors);
    }
}
